import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Minimal mock of McpServer that records tool registrations.
 */
class MockServer {
  constructor() {
    this.tools = new Map();
  }

  tool(name, description, schema, handler) {
    this.tools.set(name, { name, description, schema, handler });
  }
}

describe('STS tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers aws_whoami', async () => {
    const { registerStsTools } = await import('../src/tools-sts.js');
    registerStsTools(server);
    assert.ok(server.tools.has('aws_whoami'));
    assert.equal(server.tools.size, 1);
  });
});

describe('EC2 tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers ec2_list_instances and ec2_manage_instance', async () => {
    const { registerEc2Tools } = await import('../src/tools-ec2.js');
    registerEc2Tools(server);
    assert.ok(server.tools.has('ec2_list_instances'));
    assert.ok(server.tools.has('ec2_manage_instance'));
    assert.equal(server.tools.size, 2);
  });
});

describe('S3 tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers 4 S3 tools', async () => {
    const { registerS3Tools } = await import('../src/tools-s3.js');
    registerS3Tools(server);
    assert.ok(server.tools.has('s3_list_buckets'));
    assert.ok(server.tools.has('s3_list_objects'));
    assert.ok(server.tools.has('s3_get_object'));
    assert.ok(server.tools.has('s3_put_object'));
    assert.equal(server.tools.size, 4);
  });
});

describe('CloudWatch tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers 4 CloudWatch tools', async () => {
    const { registerCloudWatchTools } = await import('../src/tools-cloudwatch.js');
    registerCloudWatchTools(server);
    assert.ok(server.tools.has('cloudwatch_list_alarms'));
    assert.ok(server.tools.has('cloudwatch_get_metric'));
    assert.ok(server.tools.has('cloudwatch_list_log_groups'));
    assert.ok(server.tools.has('cloudwatch_get_logs'));
    assert.equal(server.tools.size, 4);
  });
});

describe('Lambda tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers 3 Lambda tools', async () => {
    const { registerLambdaTools } = await import('../src/tools-lambda.js');
    registerLambdaTools(server);
    assert.ok(server.tools.has('lambda_list_functions'));
    assert.ok(server.tools.has('lambda_get_function'));
    assert.ok(server.tools.has('lambda_invoke'));
    assert.equal(server.tools.size, 3);
  });
});

describe('ECS tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers 3 ECS tools', async () => {
    const { registerEcsTools } = await import('../src/tools-ecs.js');
    registerEcsTools(server);
    assert.ok(server.tools.has('ecs_list_clusters'));
    assert.ok(server.tools.has('ecs_list_services'));
    assert.ok(server.tools.has('ecs_list_tasks'));
    assert.equal(server.tools.size, 3);
  });
});

describe('CloudFormation tool registration', () => {
  let server;

  beforeEach(() => { server = new MockServer(); });

  it('registers 3 CloudFormation tools', async () => {
    const { registerCloudFormationTools } = await import('../src/tools-cloudformation.js');
    registerCloudFormationTools(server);
    assert.ok(server.tools.has('cfn_list_stacks'));
    assert.ok(server.tools.has('cfn_describe_stack'));
    assert.ok(server.tools.has('cfn_stack_events'));
    assert.equal(server.tools.size, 3);
  });
});

describe('Total tool count across all services', () => {
  it('registers exactly 20 tools', async () => {
    const server = new MockServer();
    const modules = await Promise.all([
      import('../src/tools-sts.js'),
      import('../src/tools-ec2.js'),
      import('../src/tools-s3.js'),
      import('../src/tools-cloudwatch.js'),
      import('../src/tools-lambda.js'),
      import('../src/tools-ecs.js'),
      import('../src/tools-cloudformation.js'),
    ]);
    const registrars = [
      modules[0].registerStsTools,
      modules[1].registerEc2Tools,
      modules[2].registerS3Tools,
      modules[3].registerCloudWatchTools,
      modules[4].registerLambdaTools,
      modules[5].registerEcsTools,
      modules[6].registerCloudFormationTools,
    ];
    for (const register of registrars) register(server);
    assert.equal(server.tools.size, 20, `Expected 20 tools but got ${server.tools.size}: ${[...server.tools.keys()].join(', ')}`);
  });

  it('all tool names are unique', async () => {
    const server = new MockServer();
    const modules = await Promise.all([
      import('../src/tools-sts.js'),
      import('../src/tools-ec2.js'),
      import('../src/tools-s3.js'),
      import('../src/tools-cloudwatch.js'),
      import('../src/tools-lambda.js'),
      import('../src/tools-ecs.js'),
      import('../src/tools-cloudformation.js'),
    ]);
    const registrars = [
      modules[0].registerStsTools,
      modules[1].registerEc2Tools,
      modules[2].registerS3Tools,
      modules[3].registerCloudWatchTools,
      modules[4].registerLambdaTools,
      modules[5].registerEcsTools,
      modules[6].registerCloudFormationTools,
    ];
    const names = [];
    const origTool = server.tool.bind(server);
    server.tool = (name, ...rest) => { names.push(name); origTool(name, ...rest); };
    for (const register of registrars) register(server);
    const uniqueNames = new Set(names);
    assert.equal(uniqueNames.size, names.length, `Duplicate tool names found`);
  });
});
