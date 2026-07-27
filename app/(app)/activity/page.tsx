import { EventFeed } from "@/components/activity/event-feed";
import { PageHeader } from "@/components/app/page-header";

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Live Activity"
        description="Every discovery, payment, and reputation update — streaming from Stellar Testnet."
      />
      <EventFeed />
    </div>
  );
}
