/**
 * Simplified Diagnostics Runner for RACKS
 * Works with actual SubagentTask/SubagentResult interfaces
 */
import { SubagentPool } from '../utils/subagentManager';
export declare function runRACKSDiagnostics(pool: SubagentPool): Promise<{
    issues: string[];
    bugs: string[];
    optimizations: string[];
}>;
//# sourceMappingURL=diagnosticsRunner.d.ts.map