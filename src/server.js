import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getEnabledServices } from './aws.js';
import { registerStsTools } from './tools-sts.js';
import { registerEc2Tools } from './tools-ec2.js';
import { registerS3Tools } from './tools-s3.js';
import { registerCloudWatchTools } from './tools-cloudwatch.js';
import { registerLambdaTools } from './tools-lambda.js';
import { registerEcsTools } from './tools-ecs.js';
import { registerCloudFormationTools } from './tools-cloudformation.js';

const server = new McpServer({
  name: 'fleet',
  version: '1.0.0',
});

const enabled = getEnabledServices();

const registry = {
  sts: registerStsTools,
  ec2: registerEc2Tools,
  s3: registerS3Tools,
  cloudwatch: registerCloudWatchTools,
  lambda: registerLambdaTools,
  ecs: registerEcsTools,
  cloudformation: registerCloudFormationTools,
};

for (const [service, register] of Object.entries(registry)) {
  if (enabled.includes(service)) {
    register(server);
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
