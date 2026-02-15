import {
  CloudFormationClient,
  ListStacksCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  DescribeStackEventsCommand,
} from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerCloudFormationTools(server) {
  const client = new CloudFormationClient(getAwsConfig());

  server.tool(
    'cfn_list_stacks',
    'List CloudFormation stacks. Optionally filter by status.',
    {
      statusFilter: z.array(z.string()).optional()
        .describe('Stack status filters (e.g. ["CREATE_COMPLETE","UPDATE_COMPLETE"]). Default excludes DELETE_COMPLETE.'),
    },
    async ({ statusFilter }) => {
      try {
        const params = {};
        if (statusFilter?.length) {
          params.StackStatusFilter = statusFilter;
        } else {
          params.StackStatusFilter = [
            'CREATE_IN_PROGRESS', 'CREATE_COMPLETE', 'CREATE_FAILED',
            'ROLLBACK_IN_PROGRESS', 'ROLLBACK_COMPLETE', 'ROLLBACK_FAILED',
            'UPDATE_IN_PROGRESS', 'UPDATE_COMPLETE', 'UPDATE_FAILED',
            'UPDATE_ROLLBACK_IN_PROGRESS', 'UPDATE_ROLLBACK_COMPLETE', 'UPDATE_ROLLBACK_FAILED',
          ];
        }

        const res = await client.send(new ListStacksCommand(params));
        const stacks = (res.StackSummaries || []).map(s => ({
          StackName: s.StackName,
          StackStatus: s.StackStatus,
          CreationTime: s.CreationTime,
          LastUpdatedTime: s.LastUpdatedTime,
          Description: s.TemplateDescription || null,
          DriftStatus: s.DriftInformation?.StackDriftStatus || null,
        }));

        return textResult({ count: stacks.length, stacks });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'cfn_describe_stack',
    'Get detailed information about a CloudFormation stack, including parameters, outputs, and resources.',
    {
      stackName: z.string().describe('Stack name or ID'),
    },
    async ({ stackName }) => {
      try {
        const [stackRes, resourcesRes] = await Promise.all([
          client.send(new DescribeStacksCommand({ StackName: stackName })),
          client.send(new ListStackResourcesCommand({ StackName: stackName })),
        ]);

        const stack = stackRes.Stacks?.[0];
        if (!stack) return textResult({ error: `Stack ${stackName} not found` });

        const resources = (resourcesRes.StackResourceSummaries || []).map(r => ({
          LogicalId: r.LogicalResourceId,
          PhysicalId: r.PhysicalResourceId,
          Type: r.ResourceType,
          Status: r.ResourceStatus,
          LastUpdated: r.LastUpdatedTimestamp,
        }));

        return textResult({
          StackName: stack.StackName,
          StackId: stack.StackId,
          Status: stack.StackStatus,
          StatusReason: stack.StackStatusReason || null,
          Description: stack.Description || null,
          CreationTime: stack.CreationTime,
          LastUpdatedTime: stack.LastUpdatedTime,
          Parameters: (stack.Parameters || []).reduce((acc, p) => {
            acc[p.ParameterKey] = p.ParameterValue;
            return acc;
          }, {}),
          Outputs: (stack.Outputs || []).reduce((acc, o) => {
            acc[o.OutputKey] = { Value: o.OutputValue, Description: o.Description };
            return acc;
          }, {}),
          Tags: (stack.Tags || []).reduce((acc, t) => {
            acc[t.Key] = t.Value;
            return acc;
          }, {}),
          ResourceCount: resources.length,
          Resources: resources,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'cfn_stack_events',
    'Get recent events for a CloudFormation stack — useful for debugging deployments.',
    {
      stackName: z.string().describe('Stack name or ID'),
      limit: z.number().optional().describe('Max events to return (default 20)'),
    },
    async ({ stackName, limit }) => {
      try {
        const res = await client.send(new DescribeStackEventsCommand({
          StackName: stackName,
        }));

        const events = (res.StackEvents || [])
          .slice(0, limit || 20)
          .map(e => ({
            Timestamp: e.Timestamp,
            LogicalResourceId: e.LogicalResourceId,
            ResourceType: e.ResourceType,
            ResourceStatus: e.ResourceStatus,
            ResourceStatusReason: e.ResourceStatusReason || null,
          }));

        return textResult({ stackName, count: events.length, events });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
