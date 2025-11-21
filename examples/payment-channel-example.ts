/**
 * Payment Channel Example
 * 
 * Demonstrates opening payment channels and sending micropayments
 */

import { RobotSDK, ForkliftRobot, OpenChannelRequest, PaymentRequest } from '../src';

async function main() {
  // Initialize SDK
  const sdk = new RobotSDK({
    network: 'testnet',
    fprEndpoint: 'https://fpr-testnet.roboos.io',
  });

  // Create wallet for robot 1
  const wallet1 = await sdk.wallet({
    storage: 'file',
    path: './robot1-wallet.json',
  });

  // Create wallet for robot 2
  const wallet2 = await sdk.wallet({
    storage: 'file',
    path: './robot2-wallet.json',
  });

  // Create two forklift robots
  const robot1 = new ForkliftRobot({
    robotId: 'forklift-001',
    wallet: wallet1,
    config: sdk.getConfig(),
    capabilities: {
      lifting: true,
      transport: true,
      stacking: true,
      maxWeight: 2000,
      maxHeight: 5,
      navigation: true,
    },
  });

  const robot2 = new ForkliftRobot({
    robotId: 'forklift-002',
    wallet: wallet2,
    config: sdk.getConfig(),
    capabilities: {
      lifting: true,
      transport: true,
      stacking: true,
      maxWeight: 2000,
      maxHeight: 5,
      navigation: true,
    },
  });

  // Initialize and connect both robots
  await robot1.initialize();
  await robot1.connect();

  await robot2.initialize();
  await robot2.connect();

  console.log('Both robots connected');

  // Robot 1 opens payment channel with Robot 2
  const fpr1 = robot1.getFPR();
  if (fpr1) {
    const openRequest: OpenChannelRequest = {
      peerRobotId: 'forklift-002',
      collateral: 1000, // 1000 ROS tokens
      expirationTime: 24 * 60 * 60 * 1000, // 24 hours
    };

    const channel = await fpr1.openChannel(openRequest);
    console.log('Payment channel opened:', {
      channelId: channel.channelId,
      peerRobotId: channel.peerRobotId,
      collateral: channel.collateral,
    });

    // Listen for channel events
    fpr1.on('channelOpened', (ch) => {
      console.log('Channel opened event:', ch.channelId);
    });

    fpr1.on('paymentReceived', (channelId, amount) => {
      console.log('Payment received:', { channelId, amount });
    });

    // Send micropayment through channel
    const paymentRequest: PaymentRequest = {
      channelId: channel.channelId,
      amount: 50, // 50 ROS tokens
      memo: 'Payment for task assistance',
    };

    await fpr1.sendPayment(paymentRequest);
    console.log('Micropayment sent');

    // Check channel status
    const status = await fpr1.getChannelStatus(channel.channelId);
    console.log('Channel status:', {
      status: status.status,
      balance: status.balance,
      canSend: status.canSend,
      canReceive: status.canReceive,
    });

    // Send another payment
    await fpr1.sendPayment({
      channelId: channel.channelId,
      amount: 25,
    });

    // Get updated status
    const updatedStatus = await fpr1.getChannelStatus(channel.channelId);
    console.log('Updated channel status:', {
      balance: updatedStatus.balance,
    });

    // List all channels
    const channels = fpr1.getChannels();
    console.log(`Robot 1 has ${channels.length} open channels`);

    // Close channel
    await fpr1.closeChannel(channel.channelId);
    console.log('Payment channel closed');
  }

  // Disconnect
  await robot1.disconnect();
  await robot2.disconnect();
}

main().catch(console.error);

