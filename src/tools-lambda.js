import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
  InvokeCommand,
} from '@aws-sdk/client-lambda';
import { z } from 'zod';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerLambdaTools(server) {
  const client = new LambdaClient(getAwsConfig());

  server.tool(
    'lambda_list_functions',
    'List Lambda functions in the account.',
    {
      maxItems: z.number().optional().describe('Max functions to return (default 50)'),
    },
    async ({ maxItems }) => {
      try {
        const res = await client.send(new ListFunctionsCommand({
          MaxItems: maxItems || 50,
        }));
        const functions = (res.Functions || []).map(f => ({
          FunctionName: f.FunctionName,
          Runtime: f.Runtime,
          Handler: f.Handler,
          MemorySize: f.MemorySize,
          Timeout: f.Timeout,
          LastModified: f.LastModified,
          CodeSize: f.CodeSize,
          Description: f.Description || null,
        }));
        return textResult({ count: functions.length, functions });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'lambda_get_function',
    'Get detailed configuration for a Lambda function.',
    {
      functionName: z.string().describe('Function name or ARN'),
    },
    async ({ functionName }) => {
      try {
        const res = await client.send(new GetFunctionCommand({
          FunctionName: functionName,
        }));
        const config = res.Configuration;
        return textResult({
          FunctionName: config.FunctionName,
          FunctionArn: config.FunctionArn,
          Runtime: config.Runtime,
          Handler: config.Handler,
          Role: config.Role,
          MemorySize: config.MemorySize,
          Timeout: config.Timeout,
          LastModified: config.LastModified,
          CodeSize: config.CodeSize,
          Description: config.Description,
          Environment: config.Environment?.Variables || {},
          Layers: (config.Layers || []).map(l => l.Arn),
          State: config.State,
          LastUpdateStatus: config.LastUpdateStatus,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'lambda_invoke',
    'Invoke a Lambda function with an optional JSON payload. Returns the response.',
    {
      functionName: z.string().describe('Function name or ARN'),
      payload: z.string().optional().describe('JSON payload string to send'),
      invocationType: z.enum(['RequestResponse', 'Event', 'DryRun']).optional()
        .describe('Invocation type (default RequestResponse for sync)'),
    },
    async ({ functionName, payload, invocationType }) => {
      try {
        const params = {
          FunctionName: functionName,
          InvocationType: invocationType || 'RequestResponse',
        };
        if (payload) params.Payload = new TextEncoder().encode(payload);

        const res = await client.send(new InvokeCommand(params));

        const responsePayload = res.Payload
          ? new TextDecoder().decode(res.Payload)
          : null;

        return textResult({
          functionName,
          statusCode: res.StatusCode,
          executedVersion: res.ExecutedVersion,
          functionError: res.FunctionError || null,
          logResult: res.LogResult
            ? Buffer.from(res.LogResult, 'base64').toString()
            : null,
          payload: responsePayload,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
