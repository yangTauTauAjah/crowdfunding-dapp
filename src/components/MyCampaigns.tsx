import React from 'react';
import CampaignListComponent, { CampaignListComponentProps } from './CampaignListComponent';

const MyCampaigns: React.FC<CampaignListComponentProps> = (props) => (
  <CampaignListComponent {...props} campaignListType="my" />
);

export default MyCampaigns;