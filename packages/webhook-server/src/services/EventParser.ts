/**
 * Event parser and normalizer for GitHub webhooks
 * BOC-2: GitHub event parser and normalizer
 */

import type {
  NormalizedEvent,
  GitHubEventType,
  EmotionCategory
} from '@bots-n-cats/audio-core';
import type {
  WebhookPayload,
  PushEventPayload,
  PullRequestEventPayload,
  PullRequestReviewEventPayload,
  CheckRunEventPayload,
  DeploymentStatusEventPayload,
  IssuesEventPayload,
  IssueCommentEventPayload,
  WorkflowRunEventPayload,
} from '../types/github.js';

/**
 * Maps GitHub webhook events to NormalizedEvent format
 */
export class EventParser {
  /**
   * Parse GitHub webhook payload into NormalizedEvent
   *
   * @param eventType - The x-github-event header value
   * @param payload - The webhook payload
   * @returns Normalized event for AudioEventBus
   */
  static parse(eventType: string, payload: WebhookPayload): NormalizedEvent {
    const parsers: Record<string, (payload: any) => NormalizedEvent> = {
      push: this.parsePush,
      pull_request: this.parsePullRequest,
      pull_request_review: this.parsePullRequestReview,
      check_run: this.parseCheckRun,
      deployment_status: this.parseDeploymentStatus,
      issues: this.parseIssues,
      issue_comment: this.parseIssueComment,
      workflow_run: this.parseWorkflowRun,
    };

    const parser = parsers[eventType];
    if (!parser) {
      throw new Error(`Unsupported event type: ${eventType}`);
    }

    return parser.call(this, payload);
  }

  /**
   * Parse push event
   */
  private static parsePush(payload: PushEventPayload): NormalizedEvent {
    const commitCount = payload.commits?.length || 0;
    const totalChanges = payload.commits?.reduce((sum, commit) => {
      return sum + commit.added.length + commit.removed.length + commit.modified.length;
    }, 0) || 0;

    // Determine emotion based on push characteristics
    let emotion: EmotionCategory = 'activity';
    if (payload.forced) {
      emotion = 'tension'; // Force push indicates conflict resolution
    } else if (commitCount > 5) {
      emotion = 'growth'; // Large batch of commits
    }

    return {
      eventType: 'push',
      action: payload.created ? 'created' : payload.deleted ? 'deleted' : 'updated',
      emotion,
      intensity: Math.min(1.0, (commitCount * 0.1) + (totalChanges * 0.01)),
      metadata: {
        ref: payload.ref || 'unknown',
        branch: payload.ref ? payload.ref.replace('refs/heads/', '') : 'unknown',
        commitCount,
        totalChanges,
        forced: payload.forced || false,
        repository: payload.repository?.full_name || 'unknown',
        sender: payload.sender?.login || 'unknown',
        commits: payload.commits?.map(c => ({
          id: c.id?.substring(0, 7) || 'unknown',
          message: c.message?.split('\n')[0] || 'No message', // First line only
          author: c.author?.username || c.author?.name || 'unknown',
        })),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse pull request event
   */
  private static parsePullRequest(payload: PullRequestEventPayload): NormalizedEvent {
    const pr = payload.pull_request;
    const changeSize = (pr.additions || 0) + (pr.deletions || 0);

    // Determine emotion based on PR state and action
    let emotion: EmotionCategory;
    if (payload.action === 'opened') {
      emotion = 'growth'; // New work
    } else if (pr.merged) {
      emotion = 'resolution'; // Successfully merged
    } else if (payload.action === 'closed' && !pr.merged) {
      emotion = 'tension'; // Closed without merging
    } else {
      emotion = 'activity'; // Updates, synchronize, etc.
    }

    return {
      eventType: 'pull_request',
      action: payload.action,
      emotion,
      intensity: Math.min(1.0, 0.5 + (changeSize * 0.0001)), // Base 0.5, scales with changes
      metadata: {
        number: pr.number || 0,
        title: pr.title || 'Untitled',
        state: pr.state || 'open',
        merged: pr.merged || false,
        draft: pr.draft || false,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
        changeSize,
        repository: payload.repository?.full_name || 'unknown',
        author: pr.user?.login || 'unknown',
        sender: payload.sender?.login || 'unknown',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse pull request review event
   */
  private static parsePullRequestReview(payload: PullRequestReviewEventPayload): NormalizedEvent {
    const review = payload.review;

    // Map review state to emotion
    let emotion: EmotionCategory;
    if (review.state === 'approved') {
      emotion = 'resolution'; // Approval moves toward merge
    } else if (review.state === 'changes_requested') {
      emotion = 'tension'; // Requires more work
    } else {
      emotion = 'activity'; // Comments
    }

    return {
      eventType: 'pull_request_review',
      action: payload.action,
      emotion,
      intensity: review.state === 'approved' ? 0.8 : review.state === 'changes_requested' ? 0.6 : 0.4,
      metadata: {
        reviewState: review.state || 'commented',
        prNumber: payload.pull_request?.number || 0,
        prTitle: payload.pull_request?.title || 'Untitled',
        reviewer: review.user?.login || 'unknown',
        repository: payload.repository?.full_name || 'unknown',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse check run event
   */
  private static parseCheckRun(payload: CheckRunEventPayload): NormalizedEvent {
    const check = payload.check_run;

    // Only process completed checks
    let emotion: EmotionCategory = 'activity';
    let intensity = 0.5;

    if (check.status === 'completed') {
      if (check.conclusion === 'success') {
        emotion = 'resolution'; // Tests passed
        intensity = 0.9;
      } else if (check.conclusion === 'failure') {
        emotion = 'tension'; // Tests failed
        intensity = 0.7;
      }
    }

    return {
      eventType: 'check_run',
      action: payload.action,
      emotion,
      intensity,
      metadata: {
        checkName: check.name || 'Unknown Check',
        status: check.status || 'unknown',
        conclusion: check.conclusion || null,
        repository: payload.repository?.full_name || 'unknown',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse deployment status event
   */
  private static parseDeploymentStatus(payload: DeploymentStatusEventPayload): NormalizedEvent {
    const status = payload.deployment_status;

    // Handle missing deployment_status object
    if (!status) {
      return {
        eventType: 'deployment_status',
        action: 'unknown',
        emotion: 'activity',
        intensity: 0.5,
        metadata: {
          environment: 'unknown',
          state: 'unknown',
          description: 'Missing deployment status data',
          repository: payload.repository?.full_name || 'unknown',
        },
        timestamp: Date.now(),
      };
    }

    // Map deployment state to emotion
    let emotion: EmotionCategory;
    if (status.state === 'success') {
      emotion = 'resolution'; // Successful deploy
    } else if (status.state === 'failure' || status.state === 'error') {
      emotion = 'tension'; // Deploy failed
    } else {
      emotion = 'activity'; // In progress, pending
    }

    return {
      eventType: 'deployment_status',
      action: status.state || 'unknown',
      emotion,
      intensity: status.state === 'success' ? 1.0 : status.state === 'failure' ? 0.8 : 0.5,
      metadata: {
        environment: status.environment || 'unknown',
        state: status.state || 'unknown',
        description: status.description || '',
        repository: payload.repository?.full_name || 'unknown',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse issues event
   */
  private static parseIssues(payload: IssuesEventPayload): NormalizedEvent {
    const issue = payload.issue;

    // Map issue action to emotion
    let emotion: EmotionCategory;
    if (payload.action === 'opened') {
      emotion = 'growth'; // New issue/work identified
    } else if (payload.action === 'closed') {
      emotion = 'resolution'; // Issue resolved
    } else {
      emotion = 'activity'; // Updates
    }

    return {
      eventType: 'issues',
      action: payload.action,
      emotion,
      intensity: payload.action === 'closed' ? 0.7 : 0.5,
      metadata: {
        issueNumber: issue.number || 0,
        title: issue.title || 'Untitled',
        state: issue.state || 'open',
        repository: payload.repository?.full_name || 'unknown',
        user: issue.user?.login || 'unknown',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse issue comment event
   */
  private static parseIssueComment(payload: IssueCommentEventPayload): NormalizedEvent {
    return {
      eventType: 'issue_comment',
      action: payload.action,
      emotion: 'activity', // Comments are general activity
      intensity: 0.4,
      metadata: {
        issueNumber: payload.issue?.number || 0,
        issueTitle: payload.issue?.title || 'Untitled',
        commentAuthor: payload.comment?.user?.login || 'unknown',
        repository: payload.repository?.full_name || 'unknown',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Parse workflow run event
   */
  private static parseWorkflowRun(payload: WorkflowRunEventPayload): NormalizedEvent {
    const workflow = payload.workflow_run;

    let emotion: EmotionCategory = 'activity';
    let intensity = 0.5;

    if (workflow.status === 'completed') {
      if (workflow.conclusion === 'success') {
        emotion = 'resolution'; // Workflow succeeded
        intensity = 0.9;
      } else if (workflow.conclusion === 'failure') {
        emotion = 'tension'; // Workflow failed
        intensity = 0.7;
      }
    }

    return {
      eventType: 'workflow_run',
      action: payload.action,
      emotion,
      intensity,
      metadata: {
        workflowName: workflow.name || 'Unknown Workflow',
        status: workflow.status || 'unknown',
        conclusion: workflow.conclusion || null,
        repository: payload.repository?.full_name || 'unknown',
      },
      timestamp: Date.now(),
    };
  }
}
