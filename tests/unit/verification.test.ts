/**
 * Verification tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ZKVerification } from '../../src/verification/ZKVerification';
import { ProofGenerationOptions, TaskProof } from '../../src/verification/types';

describe('ZKVerification', () => {
  let verification: ZKVerification;

  beforeEach(() => {
    verification = new ZKVerification();
  });

  it('should generate proof', async () => {
    const options: ProofGenerationOptions = {
      taskId: 'task-1',
      taskData: {
        taskType: 'material_handling',
        location: { x: 10, y: 20 },
      },
      robotId: 'robot-1',
      includeLocation: true,
      includeTimestamp: true,
    };

    const proof = await verification.generateProof(options);
    expect(proof).toBeDefined();
    expect(proof.taskId).toBe('task-1');
    expect(proof.robotId).toBe('robot-1');
    expect(proof.proof).toBeDefined();
    expect(proof.publicInputs).toBeDefined();
  });

  it('should verify proof', async () => {
    const options: ProofGenerationOptions = {
      taskId: 'task-1',
      taskData: {
        taskType: 'material_handling',
      },
      robotId: 'robot-1',
    };

    const proof = await verification.generateProof(options);
    const verified = await verification.verifyProof(proof);
    expect(verified).toBe(true);
  });

  it('should reject invalid proof', async () => {
    const invalidProof: TaskProof = {
      taskId: 'task-1',
      robotId: 'robot-1',
      proof: '',
      publicInputs: {
        taskId: 'task-1',
        robotId: 'robot-1',
      },
      timestamp: new Date(),
    };

    const verified = await verification.verifyProof(invalidProof);
    expect(verified).toBe(false);
  });
});

