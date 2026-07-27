/**
 * Server-side Soroban transaction helpers. Builds + simulates contract-invoke
 * transactions and submits signed XDR to Testnet. No browser APIs here.
 */
import {
  rpc,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  Keypair,
  xdr,
} from "@stellar/stellar-sdk";
import { getServer, getRelayer, NETWORK_PASSPHRASE, CONTRACT_IDS } from "./client";

const USDC_DECIMALS = 7;

/** USDC human amount -> i128 stroops (7 decimals). */
export function toStroops(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build + simulate a DelegationManager.grant() tx with the owner as the source
 * account. Because owner == source, `owner.require_auth()` is satisfied by the
 * envelope signature, so Freighter just signs the whole transaction.
 * Returns base64 XDR for the client to sign.
 */
export async function buildGrantTx(params: {
  ownerAddress: string;
  agentAddress: string;
  dailyLimit: number;
  expiresAt: number; // unix seconds
}): Promise<string> {
  if (!CONTRACT_IDS.delegationManager || !CONTRACT_IDS.usdc) {
    throw new Error("Delegation/USDC contract IDs are not configured");
  }
  const server = getServer();
  const account = await server.getAccount(params.ownerAddress);

  const contract = new Contract(CONTRACT_IDS.delegationManager);
  const op = contract.call(
    "grant",
    Address.fromString(params.ownerAddress).toScVal(),
    Address.fromString(params.agentAddress).toScVal(),
    Address.fromString(CONTRACT_IDS.usdc).toScVal(),
    nativeToScVal(toStroops(params.dailyLimit), { type: "i128" }),
    nativeToScVal(BigInt(params.expiresAt), { type: "u64" })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

/**
 * Build + simulate a DelegationManager.revoke() tx with the owner as source.
 * Returns base64 XDR for the client (Freighter) to sign.
 */
export async function buildRevokeTx(params: {
  ownerAddress: string;
  agentAddress: string;
}): Promise<string> {
  if (!CONTRACT_IDS.delegationManager) {
    throw new Error("Delegation contract ID is not configured");
  }
  const server = getServer();
  const account = await server.getAccount(params.ownerAddress);
  const contract = new Contract(CONTRACT_IDS.delegationManager);
  const op = contract.call(
    "revoke",
    Address.fromString(params.ownerAddress).toScVal(),
    Address.fromString(params.agentAddress).toScVal()
  );
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();
  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

/** Submit a signed tx XDR, wait for confirmation, return hash + decoded return value. */
export async function submitAndConfirm(
  signedXdr: string
): Promise<{ hash: string; returnValue: unknown }> {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sent = await server.sendTransaction(tx);

  if (sent.status === "ERROR") {
    throw new Error(`Submit rejected: ${JSON.stringify(sent.errorResult)}`);
  }

  let result = await server.getTransaction(sent.hash);
  let tries = 0;
  while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && tries < 30) {
    await sleep(1000);
    result = await server.getTransaction(sent.hash);
    tries++;
  }

  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction failed on-chain: ${result.status}`);
  }

  let returnValue: unknown = undefined;
  if (result.status === rpc.Api.GetTransactionStatus.SUCCESS && result.returnValue) {
    try {
      returnValue = scValToNative(result.returnValue as xdr.ScVal);
    } catch {
      returnValue = undefined;
    }
  }
  return { hash: sent.hash, returnValue };
}

/** Submit a signed transaction XDR and wait for confirmation. Returns tx hash. */
export async function submitSignedXdr(signedXdr: string): Promise<string> {
  const { hash } = await submitAndConfirm(signedXdr);
  return hash;
}

/** Read-only contract call via simulation — no fees, no submit. Returns decoded value. */
export async function simulateRead(
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<unknown> {
  const server = getServer();
  const account = await server.getAccount(getRelayer().publicKey());
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  const retval = sim.result?.retval;
  return retval ? scValToNative(retval) : undefined;
}

/**
 * Sign + submit a contract-invoke transaction with a server-held keypair
 * (used for the agent's autonomous actions). Simulates, signs, submits.
 */
export async function invokeWithKeypair(
  secret: string,
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<{ hash: string; returnValue: unknown }> {
  const server = getServer();
  const kp = Keypair.fromSecret(secret);
  const account = await server.getAccount(kp.publicKey());
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  return submitAndConfirm(prepared.toXDR());
}
