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
  parents: ProcNode[];
}

export type PSTree = ProcNode | null;

export function getParents(procNode: ProcNode): ProcNode[] {
  if (!procNode.parent) return [];
  return [...getParents(procNode.parent), procNode.parent];
}

export function getPidsProcInfo(): PidsProcInfo {
  return sigar.procList.reduce((pidsProcInfo: PidsProcInfo, pid: number) => {
    let args: string[] = [];
    try {
      args = sigar.getProcArgs(pid);
      // eslint-disable-next-line no-empty
    } catch (err) {}
    pidsProcInfo[pid.toString()] = new Proxy(
      {
        args,
        pid,
        ...sigar.getProcState(pid)
      },
      {
        get(target: any, prop) {
          if (prop === 'parents') return getParents(target);
          return target[prop];
        }
      }
    );
    return pidsProcInfo;
  }, {});
}

export default function psTree(rootPid?: number): PSTree {
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
    (psTree: PSTree, [_pid, pidProcInfo]: [string, PidProcInfo]) => {
      const procNode = pidProcInfo as ProcNode;
      if (!procNode.children) procNode.children = [];
      procNode.parent = getParent(procNode);
      procNode.depth = procNode.parent ? procNode.parent.depth + 1 : 0;
      if (typeof rootPid === 'number' ? procNode.pid === rootPid : !psTree) {
        psTree = procNode;
      }
      return psTree;
    },
    null
  );
}
