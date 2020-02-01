import Sigar, { ProcState } from 'node-sigar';

const sigar = new Sigar();

export interface PidProcInfo extends ProcState {
  args: string[];
  pid: number;
}

export interface PidsProcInfo {
  [key: string]: PidProcInfo;
}

export interface ProcNode extends PidProcInfo {
  children: ProcNode[];
  depth: number;
  parent: ProcNode | null;
}

export type ProcTree = ProcNode;

export function getPidsProcInfo(): PidsProcInfo {
  return sigar.procList.reduce((pidsProcInfo: PidsProcInfo, pid: number) => {
    pidsProcInfo[pid.toString()] = {
      args: sigar.getProcArgs(pid),
      pid,
      ...sigar.getProcState(pid)
    };
    return pidsProcInfo;
  }, {});
}

export default function procTree() {
  const pidsProcInfo = getPidsProcInfo();
  function getParent(procNode: ProcNode): ProcNode | null {
    const parentNode =
      (pidsProcInfo[procNode.ppid.toString()] as ProcNode) || null;
    if (parentNode) {
      if (!parentNode.children) parentNode.children = [];
      parentNode.children.push(procNode);
      if (typeof parentNode.depth !== 'number') {
        parentNode.parent = getParent(parentNode);
        parentNode.depth = parentNode.parent ? parentNode.parent.depth + 1 : 0;
      }
    }
    return parentNode;
  }
  return Object.entries(pidsProcInfo).reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (procTree: ProcTree | null, [_pid, pidProcInfo]: [string, PidProcInfo]) => {
      const procNode = pidProcInfo as ProcNode;
      if (!procNode.children) procNode.children = [];
      procNode.parent = getParent(procNode);
      procNode.depth = procNode.parent ? procNode.parent.depth + 1 : 0;
      if (!procTree) procTree = procNode;
      return procTree;
    },
    null
  );
}
