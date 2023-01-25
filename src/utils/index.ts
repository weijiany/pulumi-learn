import { Config } from '@pulumi/pulumi';
import * as R from 'ramda';

const config = new Config();

export const assignOwner = R.mergeLeft(config.getObject('tags') as Record<string, string>);
export const concatName = R.concat(config.get('resourceNamePrefix') as string + '-');
