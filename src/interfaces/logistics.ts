export type LogisticsPackageStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PICKED_UP'
  | 'PACKAGED'
  | 'SHIPPED'
  | 'DELIVERED';

export interface ILogisticsCompany {
  id: string;
  name: string;
  status: 'ENABLED' | 'DISABLED';
  createdAt: string;
}

export interface ILogisticsPackage {
  id: string;
  tradeId: string;
  companyId: string;
  companyName?: string;
  requestedByUserId: string;
  assignedOperatorId: string | null;
  status: LogisticsPackageStatus;
  trackingNumber: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  pickedUpAt: string | null;
  packagedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestCourierPackagePayload {
  tradeCode: string;
  companyId: string;
}
