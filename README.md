# fleet-claude-plugin

AWS services monitor and interaction plugin for Claude Code.

Attach and allow Claude to monitor and interact with your AWS infrastructure — EC2 instances, S3 buckets, Lambda functions, ECS clusters, CloudWatch alarms/logs, and CloudFormation stacks.

## Install

Add the Fingerskier marketplace (if you haven't already):

```bash
claude plugin marketplace add fingerskier/claude-plugins
```

Then install:

```bash
claude plugin install fleet@fingerskier-plugins
```

## Configuration

Fleet uses standard AWS SDK credential resolution. Set your credentials via environment variables, AWS profile, or IAM role.

### Required

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_SESSION_TOKEN` | Session token (if using temporary credentials) |

Or configure an AWS profile:

```bash
export AWS_PROFILE=my-profile
```

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region |
| `FLEET_SERVICES` | all | Comma-separated list of services to enable |

### Enabling specific services

By default all services are enabled. To limit which tools are registered, set `FLEET_SERVICES`:

```bash
export FLEET_SERVICES=ec2,s3,lambda
```

Available services: `sts`, `ec2`, `s3`, `cloudwatch`, `lambda`, `ecs`, `cloudformation`

## Tools

### STS

| Tool | Description |
|------|-------------|
| `aws_whoami` | Get current AWS caller identity — account, ARN, region |

### EC2

| Tool | Description |
|------|-------------|
| `ec2_list_instances` | List instances with optional state/tag filters |
| `ec2_manage_instance` | Start, stop, or reboot an instance |

### S3

| Tool | Description |
|------|-------------|
| `s3_list_buckets` | List all buckets |
| `s3_list_objects` | List objects in a bucket (with prefix filter) |
| `s3_get_object` | Read a text object's contents |
| `s3_put_object` | Write text content to an object |

### CloudWatch

| Tool | Description |
|------|-------------|
| `cloudwatch_list_alarms` | List alarms, filter by state |
| `cloudwatch_get_metric` | Query metric data for a resource |
| `cloudwatch_list_log_groups` | List log groups |
| `cloudwatch_get_logs` | Get log events from a log stream |

### Lambda

| Tool | Description |
|------|-------------|
| `lambda_list_functions` | List Lambda functions |
| `lambda_get_function` | Get function configuration details |
| `lambda_invoke` | Invoke a function with optional payload |

### ECS

| Tool | Description |
|------|-------------|
| `ecs_list_clusters` | List ECS clusters |
| `ecs_list_services` | List services in a cluster (with details) |
| `ecs_list_tasks` | List and describe tasks in a cluster |

### CloudFormation

| Tool | Description |
|------|-------------|
| `cfn_list_stacks` | List stacks with status filter |
| `cfn_describe_stack` | Stack details, parameters, outputs, resources |
| `cfn_stack_events` | Recent stack events for debugging deployments |

## Examples

Ask Claude things like:

- "What AWS account am I using?"
- "List all running EC2 instances"
- "Show me any CloudWatch alarms in ALARM state"
- "What Lambda functions do I have?"
- "List objects in my-bucket with prefix logs/"
- "Describe the production CloudFormation stack"
- "What ECS services are running in my cluster?"
- "Show me the last 20 log events from /aws/lambda/my-function"
- "Stop instance i-0abc123"
- "Invoke my-function with payload {\"key\": \"value\"}"

## License

[MIT](./LICENSE)
