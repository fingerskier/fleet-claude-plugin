import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerStsTools(server) {
  const client = new STSClient(getAwsConfig());

  server.tool(
    'aws_whoami',
    'Get current AWS caller identity — account ID, user/role ARN, and region',
    {},
    async () => {
      try {
        const res = await client.send(new GetCallerIdentityCommand({}));
        return textResult({
          Account: res.Account,
          Arn: res.Arn,
          UserId: res.UserId,
          Region: getAwsConfig().region,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
