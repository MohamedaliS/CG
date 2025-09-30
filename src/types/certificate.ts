export interface Certificate {
  id: string;
  user_id: string;
  participant_name: string;
  event_name: string;
  batch_id: string;
  is_active: boolean;
  generated_at: Date;
}

export interface CertificateWithUser extends Certificate {
  organization_name: string;
}

export interface GenerationBatch {
  id: string;
  user_id: string;
  event_name: string;
  participant_count: number;
  status: 'processing' | 'completed' | 'failed';
  file_path?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface GenerateCertificatesRequest {
  event_name: string;
  participant_names: string[];
  template_id: string;
}

export interface CertificateGenerationResult {
  batch_id: string;
  certificates: Certificate[];
  zip_file_path: string;
  download_url: string;
}

export interface VerificationResult {
  valid: boolean;
  certificate?: CertificateWithUser;
  message: string;
}
