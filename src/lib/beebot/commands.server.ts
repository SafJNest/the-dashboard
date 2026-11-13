import source from '../../data/commands.json';
import type { CommandSource } from '../commands';

export function getCommandSource(): CommandSource {
  return source as CommandSource;
}
