/**
 * Payment Channel tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentChannelManager } from '../../src/fpr/PaymentChannel';
import { PaymentChannel } from '../../src/fpr/types';

describe('PaymentChannelManager', () => {
  let manager: PaymentChannelManager;

  beforeEach(() => {
    manager = new PaymentChannelManager();
  });

  it('should add channel', () => {
    const channel: PaymentChannel = {
      channelId: 'channel-1',
      peerRobotId: 'robot-2',
      status: 'open',
      balance: 0,
      collateral: 1000,
      createdAt: new Date(),
    };

    manager.addChannel(channel);
    expect(manager.getChannel('channel-1')).toBeDefined();
  });

  it('should update channel balance', () => {
    const channel: PaymentChannel = {
      channelId: 'channel-1',
      peerRobotId: 'robot-2',
      status: 'active',
      balance: 0,
      collateral: 1000,
      createdAt: new Date(),
    };

    manager.addChannel(channel);
    manager.updateBalance('channel-1', 100);
    
    const updated = manager.getChannel('channel-1');
    expect(updated?.balance).toBe(100);
  });

  it('should check if channel can send payment', () => {
    const channel: PaymentChannel = {
      channelId: 'channel-1',
      peerRobotId: 'robot-2',
      status: 'active',
      balance: 500,
      collateral: 1000,
      createdAt: new Date(),
    };

    manager.addChannel(channel);
    expect(manager.canSendPayment('channel-1', 100)).toBe(true);
    expect(manager.canSendPayment('channel-1', 600)).toBe(false);
  });

  it('should record payment sent', () => {
    const channel: PaymentChannel = {
      channelId: 'channel-1',
      peerRobotId: 'robot-2',
      status: 'active',
      balance: 500,
      collateral: 1000,
      createdAt: new Date(),
    };

    manager.addChannel(channel);
    manager.recordPaymentSent('channel-1', 100);
    
    const updated = manager.getChannel('channel-1');
    expect(updated?.balance).toBe(400);
  });

  it('should record payment received', () => {
    const channel: PaymentChannel = {
      channelId: 'channel-1',
      peerRobotId: 'robot-2',
      status: 'active',
      balance: 200,
      collateral: 1000,
      createdAt: new Date(),
    };

    manager.addChannel(channel);
    manager.recordPaymentReceived('channel-1', 100);
    
    const updated = manager.getChannel('channel-1');
    expect(updated?.balance).toBe(300);
  });

  it('should get active channels', () => {
    const channels: PaymentChannel[] = [
      {
        channelId: 'channel-1',
        peerRobotId: 'robot-2',
        status: 'active',
        balance: 0,
        collateral: 1000,
        createdAt: new Date(),
      },
      {
        channelId: 'channel-2',
        peerRobotId: 'robot-3',
        status: 'closed',
        balance: 0,
        collateral: 1000,
        createdAt: new Date(),
      },
    ];

    channels.forEach(ch => manager.addChannel(ch));
    const active = manager.getActiveChannels();
    expect(active.length).toBe(1);
    expect(active[0].channelId).toBe('channel-1');
  });
});

