import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { z } from 'zod';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerCloudWatchTools(server) {
  const cwClient = new CloudWatchClient(getAwsConfig());
  const logsClient = new CloudWatchLogsClient(getAwsConfig());

  server.tool(
    'cloudwatch_list_alarms',
    'List CloudWatch alarms. Optionally filter by state (OK, ALARM, INSUFFICIENT_DATA).',
    {
      stateValue: z.enum(['OK', 'ALARM', 'INSUFFICIENT_DATA']).optional().describe('Filter by alarm state'),
      maxRecords: z.number().optional().describe('Max alarms to return (default 50)'),
    },
    async ({ stateValue, maxRecords }) => {
      try {
        const params = { MaxRecords: maxRecords || 50 };
        if (stateValue) params.StateValue = stateValue;

        const res = await cwClient.send(new DescribeAlarmsCommand(params));
        const alarms = (res.MetricAlarms || []).map(a => ({
          Name: a.AlarmName,
          State: a.StateValue,
          Metric: a.MetricName,
          Namespace: a.Namespace,
          Description: a.AlarmDescription || null,
          StateReason: a.StateReason,
          UpdatedAt: a.StateUpdatedTimestamp,
        }));
        return textResult({ count: alarms.length, alarms });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'cloudwatch_get_metric',
    'Query a CloudWatch metric for a given period. Returns datapoints.',
    {
      namespace: z.string().describe('CloudWatch namespace (e.g. AWS/EC2, AWS/Lambda)'),
      metricName: z.string().describe('Metric name (e.g. CPUUtilization, Invocations)'),
      dimensionName: z.string().describe('Dimension name (e.g. InstanceId, FunctionName)'),
      dimensionValue: z.string().describe('Dimension value'),
      stat: z.enum(['Average', 'Sum', 'Minimum', 'Maximum', 'SampleCount']).optional().describe('Statistic (default Average)'),
      periodSeconds: z.number().optional().describe('Period in seconds (default 300)'),
      hoursBack: z.number().optional().describe('How many hours back to query (default 1)'),
    },
    async ({ namespace, metricName, dimensionName, dimensionValue, stat, periodSeconds, hoursBack }) => {
      try {
        const now = new Date();
        const start = new Date(now.getTime() - (hoursBack || 1) * 3600 * 1000);

        const res = await cwClient.send(new GetMetricDataCommand({
          StartTime: start,
          EndTime: now,
          MetricDataQueries: [{
            Id: 'm1',
            MetricStat: {
              Metric: {
                Namespace: namespace,
                MetricName: metricName,
                Dimensions: [{ Name: dimensionName, Value: dimensionValue }],
              },
              Period: periodSeconds || 300,
              Stat: stat || 'Average',
            },
          }],
        }));

        const result = res.MetricDataResults?.[0];
        const datapoints = (result?.Timestamps || []).map((ts, i) => ({
          timestamp: ts,
          value: result.Values[i],
        })).sort((a, b) => a.timestamp - b.timestamp);

        return textResult({
          namespace,
          metricName,
          stat: stat || 'Average',
          period: periodSeconds || 300,
          range: { start, end: now },
          datapoints,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'cloudwatch_list_log_groups',
    'List CloudWatch Logs log groups. Optionally filter by name prefix.',
    {
      prefix: z.string().optional().describe('Log group name prefix to filter by'),
      limit: z.number().optional().describe('Max log groups to return (default 50)'),
    },
    async ({ prefix, limit }) => {
      try {
        const params = { limit: limit || 50 };
        if (prefix) params.logGroupNamePrefix = prefix;

        const res = await logsClient.send(new DescribeLogGroupsCommand(params));
        const groups = (res.logGroups || []).map(g => ({
          name: g.logGroupName,
          storedBytes: g.storedBytes,
          retentionDays: g.retentionInDays || 'never expires',
          creationTime: g.creationTime ? new Date(g.creationTime) : null,
        }));
        return textResult({ count: groups.length, logGroups: groups });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'cloudwatch_get_logs',
    'Get recent log events from a CloudWatch Logs log group and stream.',
    {
      logGroupName: z.string().describe('Log group name (e.g. /aws/lambda/my-function)'),
      logStreamName: z.string().describe('Log stream name'),
      limit: z.number().optional().describe('Max events to return (default 50)'),
      startFromHead: z.boolean().optional().describe('Start from oldest (true) or newest (false, default)'),
    },
    async ({ logGroupName, logStreamName, limit, startFromHead }) => {
      try {
        const res = await logsClient.send(new GetLogEventsCommand({
          logGroupName,
          logStreamName,
          limit: limit || 50,
          startFromHead: startFromHead ?? false,
        }));
        const events = (res.events || []).map(e => ({
          timestamp: new Date(e.timestamp),
          message: e.message,
        }));
        return textResult({ logGroupName, logStreamName, count: events.length, events });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
