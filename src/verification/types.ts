/**
 * Task Verification types
 */

export interface TaskProof {
  taskId: string;
  proof: string; // ZK proof (base64 encoded)
  publicInputs: Record<string, unknown>;
  timestamp: Date;
  robotId: string;
}

export interface VerificationRequest {
  taskId: string;
  proof: TaskProof;
}

export interface VerificationResult {
  taskId: string;
  verified: boolean;
  verifiedAt: Date;
  error?: string;
}

export interface ProofGenerationOptions {
  taskId: string;
  taskData: Record<string, unknown>;
  robotId: string;
  includeLocation?: boolean;
  includeTimestamp?: boolean;
}

