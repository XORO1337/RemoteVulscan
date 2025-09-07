/**
 * Tools API Client Service for Backend
 * This provides internal communication between backend services
 */

import { logger } from '@/utils/logger';

export interface ToolInfo {
  available: boolean;
  version?: string;
  category: string;
  binary: string;
  error?: string;
}

export interface ToolsStatus {
  tools: Record<string, ToolInfo>;
  categories: string[];
}

export class ToolsAPIClient {
  private toolExecutionService: any;

  constructor(toolExecutionService: any) {
    this.toolExecutionService = toolExecutionService;
  }

  /**
   * Get status of all available tools
   */
  async getToolsStatus(): Promise<ToolsStatus> {
    try {
      const tools = await this.toolExecutionService.getAvailableTools();
      const categories = this.toolExecutionService.getCategories();
      
      return {
        tools: Object.fromEntries(tools),
        categories
      };
    } catch (error) {
      logger.error('Failed to get tools status:', error);
      throw error;
    }
  }

  /**
   * Get specific tool information
   */
  async getToolInfo(toolName: string): Promise<ToolInfo> {
    try {
      const tools = await this.toolExecutionService.getAvailableTools();
      const tool = tools.get(toolName);
      
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }
      
      return tool;
    } catch (error) {
      logger.error(`Failed to get tool info for ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Check if tools API is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      return this.toolExecutionService !== null;
    } catch (error) {
      logger.error('Tools API health check failed:', error);
      return false;
    }
  }
}
