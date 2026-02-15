import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
} from '@aws-sdk/client-ec2';
import { z } from 'zod';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerEc2Tools(server) {
  const client = new EC2Client(getAwsConfig());

  server.tool(
    'ec2_list_instances',
    'List EC2 instances. Optionally filter by state (running, stopped, etc.) or by a tag name/value.',
    {
      state: z.string().optional().describe('Filter by instance state: running, stopped, pending, terminated'),
      tagKey: z.string().optional().describe('Filter by tag key'),
      tagValue: z.string().optional().describe('Filter by tag value (requires tagKey)'),
      maxResults: z.number().optional().describe('Max results to return (default 50)'),
    },
    async ({ state, tagKey, tagValue, maxResults }) => {
      try {
        const filters = [];
        if (state) filters.push({ Name: 'instance-state-name', Values: [state] });
        if (tagKey && tagValue) filters.push({ Name: `tag:${tagKey}`, Values: [tagValue] });

        const params = {};
        if (filters.length) params.Filters = filters;
        if (maxResults) params.MaxResults = maxResults;

        const res = await client.send(new DescribeInstancesCommand(params));

        const instances = (res.Reservations || []).flatMap(r => r.Instances || []).map(i => ({
          InstanceId: i.InstanceId,
          State: i.State?.Name,
          Type: i.InstanceType,
          LaunchTime: i.LaunchTime,
          PublicIp: i.PublicIpAddress || null,
          PrivateIp: i.PrivateIpAddress || null,
          Name: i.Tags?.find(t => t.Key === 'Name')?.Value || null,
          Tags: i.Tags?.reduce((acc, t) => { acc[t.Key] = t.Value; return acc; }, {}) || {},
        }));

        return textResult({ count: instances.length, instances });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'ec2_manage_instance',
    'Start, stop, or reboot an EC2 instance by instance ID.',
    {
      instanceId: z.string().describe('The EC2 instance ID (e.g. i-0abc123def456)'),
      action: z.enum(['start', 'stop', 'reboot']).describe('Action to perform'),
    },
    async ({ instanceId, action }) => {
      try {
        const params = { InstanceIds: [instanceId] };
        let res;
        switch (action) {
          case 'start':
            res = await client.send(new StartInstancesCommand(params));
            return textResult({
              action: 'start',
              instanceId,
              previousState: res.StartingInstances?.[0]?.PreviousState?.Name,
              currentState: res.StartingInstances?.[0]?.CurrentState?.Name,
            });
          case 'stop':
            res = await client.send(new StopInstancesCommand(params));
            return textResult({
              action: 'stop',
              instanceId,
              previousState: res.StoppingInstances?.[0]?.PreviousState?.Name,
              currentState: res.StoppingInstances?.[0]?.CurrentState?.Name,
            });
          case 'reboot':
            await client.send(new RebootInstancesCommand(params));
            return textResult({ action: 'reboot', instanceId, status: 'reboot initiated' });
        }
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
