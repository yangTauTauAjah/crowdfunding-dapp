import React from 'react';
import CampaignListComponent, { CampaignListComponentProps } from './CampaignListComponent';

const AllCampaigns: React.FC<CampaignListComponentProps> = (props) => (
  <CampaignListComponent {...props} campaignListType="all" />
);

export default AllCampaigns;