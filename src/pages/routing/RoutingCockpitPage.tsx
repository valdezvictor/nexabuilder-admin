import React, { useEffect, useState } from "react";
import { fetchLeadTimeline, fetchRoutingScore } from "../../api/routingApi";
import { LeadTimelineResponse, RankedContractor } from "../../api/routingTypes";

import LeadSelectorPanel from "../../components/routing/LeadSelectorPanel";
import LeadDetailsCard from "../../components/routing/LeadDetailsCard";
import TimelinePanel from "../../components/routing/TimelinePanel";
import RankedContractorsPanel from "../../components/routing/RankedContractorsPanel";

const RoutingCockpitPage: React.FC = () => {
  const [leadId, setLeadId] = useState<number>(1);
  const [timeline, setTimeline] = useState<LeadTimelineResponse | null>(null);
  const [ranked, setRanked] = useState<RankedContractor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tl, rankedList] = await Promise.all([
          fetchLeadTimeline(leadId),
          fetchRoutingScore(leadId),
        ]);
        setTimeline(tl);
        setRanked(rankedList);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [leadId]);

  return (
    <div className="flex gap-4 p-4 h-full">
      {/* Left column */}
      <div className="w-1/4 flex flex-col gap-4">
        <LeadSelectorPanel selectedLeadId={leadId} onSelectLead={setLeadId} />
        {timeline && <LeadDetailsCard timeline={timeline} />}
      </div>

      {/* Center column */}
      <div className="w-2/4">
        {timeline && <TimelinePanel events={timeline.events} />}
      </div>

      {/* Right column */}
      <div className="w-1/4">
        <RankedContractorsPanel ranked={ranked} />
      </div>

      {loading && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded">
          Loading…
        </div>
      )}
    </div>
  );
};

export default RoutingCockpitPage;
