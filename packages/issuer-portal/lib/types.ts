export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export type UserRole = 'user' | 'admin';

export interface KycSubmission {
  id: string;
  user_id: string;
  full_name: string;
  nationality: string;
  dob: string;
  document_number: string;
  subject_address: string;
  status: SubmissionStatus;
  rejection_reason: string | null;
  vc_jwt: string | null;
  credential_id: string | null;
  credential_hash: string | null;
  tx_hash: string | null;
  issuer_did: string | null;
  subject_did: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  created_at: string;
}
