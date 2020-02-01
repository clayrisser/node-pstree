import { inspect } from 'util';
// eslint-disable-next-line import/no-extraneous-dependencies
import { stringify } from 'circular-json';
import procTree from '../src';

console.info(
  inspect(JSON.parse(stringify(procTree())), {
    colors: true,
    showHidden: true,
    depth: null
  })
);
