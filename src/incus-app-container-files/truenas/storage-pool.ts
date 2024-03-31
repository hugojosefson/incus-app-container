export type StoragePool = {
  id: string;
  name: string;
  guid?: string;
  path?: string;
  status?: "ONLINE" | "OFFLINE" | "DEGRADED" | "FAULTED" | "REMOVED";
  healthy?: boolean;
  warning?: boolean;
  status_code?: string;
  status_detail?: string;
  size?: number;
  allocated?: number;
  free?: number;
};
