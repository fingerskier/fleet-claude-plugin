import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
} from '@aws-sdk/client-ecs';
import { z } from 'zod';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerEcsTools(server) {
  const client = new ECSClient(getAwsConfig());

  server.tool(
    'ecs_list_clusters',
    'List ECS clusters in the account.',
    {},
    async () => {
      try {
        const res = await client.send(new ListClustersCommand({}));
        const arns = res.clusterArns || [];
        return textResult({
          count: arns.length,
          clusters: arns.map(arn => ({
            arn,
            name: arn.split('/').pop(),
          })),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'ecs_list_services',
    'List services in an ECS cluster.',
    {
      cluster: z.string().describe('Cluster name or ARN'),
      maxResults: z.number().optional().describe('Max results (default 50)'),
    },
    async ({ cluster, maxResults }) => {
      try {
        const listRes = await client.send(new ListServicesCommand({
          cluster,
          maxResults: maxResults || 50,
        }));
        const arns = listRes.serviceArns || [];

        if (arns.length === 0) {
          return textResult({ cluster, count: 0, services: [] });
        }

        const descRes = await client.send(new DescribeServicesCommand({
          cluster,
          services: arns,
        }));

        const services = (descRes.services || []).map(s => ({
          serviceName: s.serviceName,
          status: s.status,
          desiredCount: s.desiredCount,
          runningCount: s.runningCount,
          pendingCount: s.pendingCount,
          launchType: s.launchType,
          taskDefinition: s.taskDefinition,
          createdAt: s.createdAt,
        }));

        return textResult({ cluster, count: services.length, services });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'ecs_list_tasks',
    'List tasks in an ECS cluster, optionally filtered by service.',
    {
      cluster: z.string().describe('Cluster name or ARN'),
      serviceName: z.string().optional().describe('Service name to filter by'),
      desiredStatus: z.enum(['RUNNING', 'PENDING', 'STOPPED']).optional().describe('Filter by task status'),
    },
    async ({ cluster, serviceName, desiredStatus }) => {
      try {
        const params = { cluster };
        if (serviceName) params.serviceName = serviceName;
        if (desiredStatus) params.desiredStatus = desiredStatus;

        const listRes = await client.send(new ListTasksCommand(params));
        const arns = listRes.taskArns || [];

        if (arns.length === 0) {
          return textResult({ cluster, count: 0, tasks: [] });
        }

        const descRes = await client.send(new DescribeTasksCommand({
          cluster,
          tasks: arns,
        }));

        const tasks = (descRes.tasks || []).map(t => ({
          taskArn: t.taskArn,
          taskDefinitionArn: t.taskDefinitionArn,
          lastStatus: t.lastStatus,
          desiredStatus: t.desiredStatus,
          cpu: t.cpu,
          memory: t.memory,
          launchType: t.launchType,
          startedAt: t.startedAt,
          stoppedAt: t.stoppedAt,
          stoppedReason: t.stoppedReason || null,
          containers: (t.containers || []).map(c => ({
            name: c.name,
            lastStatus: c.lastStatus,
            exitCode: c.exitCode,
            reason: c.reason || null,
          })),
        }));

        return textResult({ cluster, count: tasks.length, tasks });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
