/**
 * Task type definitions and helpers
 */

import { TaskType, Task } from './types';

export interface TaskTypeDefinition {
  type: TaskType;
  name: string;
  description: string;
  commonRequirements: string[];
  defaultMetadata: Record<string, unknown>;
}

export const TASK_TYPE_DEFINITIONS: Record<TaskType, TaskTypeDefinition> = {
  material_handling: {
    type: 'material_handling',
    name: 'Material Handling',
    description: 'Transport and handle materials, packages, or goods',
    commonRequirements: ['lifting_capacity', 'navigation', 'gripper'],
    defaultMetadata: {
      maxWeight: 0,
      dimensions: {},
    },
  },
  navigation: {
    type: 'navigation',
    name: 'Navigation',
    description: 'Navigate to specific locations or follow routes',
    commonRequirements: ['mapping', 'localization', 'path_planning'],
    defaultMetadata: {
      route: [],
      obstacles: [],
    },
  },
  delivery: {
    type: 'delivery',
    name: 'Delivery',
    description: 'Deliver items to specified destinations',
    commonRequirements: ['navigation', 'storage', 'authentication'],
    defaultMetadata: {
      recipient: '',
      items: [],
    },
  },
  cleaning: {
    type: 'cleaning',
    name: 'Cleaning',
    description: 'Clean areas, surfaces, or routes',
    commonRequirements: ['coverage_planning', 'cleaning_tools', 'navigation'],
    defaultMetadata: {
      area: 0,
      cleaningType: 'general',
    },
  },
  medical_transport: {
    type: 'medical_transport',
    name: 'Medical Transport',
    description: 'Transport medical supplies, samples, or equipment',
    commonRequirements: ['sterilization', 'temperature_control', 'navigation'],
    defaultMetadata: {
      temperature: null,
      urgency: 'normal',
    },
  },
  sterilization: {
    type: 'sterilization',
    name: 'Sterilization',
    description: 'Sterilize equipment, surfaces, or areas',
    commonRequirements: ['sterilization_equipment', 'coverage_planning'],
    defaultMetadata: {
      method: 'uv',
      duration: 0,
    },
  },
  surveillance: {
    type: 'surveillance',
    name: 'Surveillance',
    description: 'Monitor areas, detect anomalies, or patrol routes',
    commonRequirements: ['camera', 'sensors', 'navigation'],
    defaultMetadata: {
      duration: 0,
      alertThreshold: 0,
    },
  },
  assembly: {
    type: 'assembly',
    name: 'Assembly',
    description: 'Assemble components or products',
    commonRequirements: ['manipulation', 'precision', 'vision'],
    defaultMetadata: {
      components: [],
      tolerance: 0,
    },
  },
  manipulation: {
    type: 'manipulation',
    name: 'Manipulation',
    description: 'Manipulate objects with precision',
    commonRequirements: ['gripper', 'precision', 'force_control'],
    defaultMetadata: {
      objectType: '',
      precision: 0,
    },
  },
  custom: {
    type: 'custom',
    name: 'Custom Task',
    description: 'Custom task type',
    commonRequirements: [],
    defaultMetadata: {},
  },
};

/**
 * Get task type definition
 */
export function getTaskTypeDefinition(type: TaskType): TaskTypeDefinition {
  return TASK_TYPE_DEFINITIONS[type];
}

/**
 * Validate task against type definition
 */
export function validateTask(task: Task): { valid: boolean; errors: string[] } {
  const definition = TASK_TYPE_DEFINITIONS[task.type];
  const errors: string[] = [];

  // Check required fields
  if (!task.taskId) {
    errors.push('Task ID is required');
  }
  if (!task.title) {
    errors.push('Task title is required');
  }
  if (task.reward < 0) {
    errors.push('Task reward must be non-negative');
  }
  if (task.estimatedDuration <= 0) {
    errors.push('Estimated duration must be positive');
  }

  // Check requirements
  for (const req of definition.commonRequirements) {
    if (!task.requirements.includes(req)) {
      errors.push(`Missing required capability: ${req}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate task complexity score (0-1)
 */
export function estimateTaskComplexity(task: Task): number {
  let complexity = 0.5; // Base complexity

  // Adjust based on requirements
  complexity += task.requirements.length * 0.1;
  
  // Adjust based on duration
  if (task.estimatedDuration > 3600) {
    complexity += 0.2;
  } else if (task.estimatedDuration > 1800) {
    complexity += 0.1;
  }

  // Adjust based on deadline urgency
  if (task.deadline) {
    const timeUntilDeadline = task.deadline.getTime() - Date.now();
    if (timeUntilDeadline < 3600000) { // Less than 1 hour
      complexity += 0.2;
    }
  }

  return Math.min(1.0, complexity);
}

