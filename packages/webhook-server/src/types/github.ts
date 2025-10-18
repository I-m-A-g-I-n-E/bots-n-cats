/**
 * GitHub webhook payload types
 * BOC-2: GitHub event parser and normalizer
 */

/**
 * Base GitHub webhook payload
 */
export interface GitHubWebhookPayload {
  action?: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
      type: string;
    };
  };
  sender: {
    login: string;
    id: number;
    type: string;
  };
}

/**
 * Push event payload
 */
export interface PushEventPayload extends GitHubWebhookPayload {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  } | null;
}

/**
 * Pull Request event payload
 */
export interface PullRequestEventPayload extends GitHubWebhookPayload {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize' | 'edited' | 'review_requested' | 'review_request_removed';
  number: number;
  pull_request: {
    id: number;
    number: number;
    state: 'open' | 'closed';
    title: string;
    body: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    merged: boolean;
    draft: boolean;
    additions: number;
    deletions: number;
    changed_files: number;
    user: {
      login: string;
      id: number;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  };
}

/**
 * Pull Request Review event payload
 */
export interface PullRequestReviewEventPayload extends GitHubWebhookPayload {
  action: 'submitted' | 'edited' | 'dismissed';
  review: {
    id: number;
    user: {
      login: string;
      id: number;
    };
    body: string | null;
    state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
    submitted_at: string;
  };
  pull_request: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
  };
}

/**
 * Check Run event payload
 */
export interface CheckRunEventPayload extends GitHubWebhookPayload {
  action: 'created' | 'completed' | 'rerequested' | 'requested_action';
  check_run: {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
    started_at: string;
    completed_at: string | null;
    output: {
      title: string | null;
      summary: string | null;
      text: string | null;
    };
  };
}

/**
 * Deployment Status event payload
 */
export interface DeploymentStatusEventPayload extends GitHubWebhookPayload {
  deployment_status: {
    id: number;
    state: 'error' | 'failure' | 'inactive' | 'pending' | 'success' | 'queued' | 'in_progress';
    description: string | null;
    environment: string;
    created_at: string;
    updated_at: string;
  };
  deployment: {
    id: number;
    sha: string;
    ref: string;
    task: string;
    environment: string;
    description: string | null;
    created_at: string;
  };
}

/**
 * Issues event payload
 */
export interface IssuesEventPayload extends GitHubWebhookPayload {
  action: 'opened' | 'edited' | 'deleted' | 'closed' | 'reopened' | 'assigned' | 'unassigned' | 'labeled' | 'unlabeled';
  issue: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    body: string | null;
    user: {
      login: string;
      id: number;
    };
  };
}

/**
 * Issue Comment event payload
 */
export interface IssueCommentEventPayload extends GitHubWebhookPayload {
  action: 'created' | 'edited' | 'deleted';
  issue: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
  };
  comment: {
    id: number;
    body: string;
    created_at: string;
    updated_at: string;
    user: {
      login: string;
      id: number;
    };
  };
}

/**
 * Workflow Run event payload
 */
export interface WorkflowRunEventPayload extends GitHubWebhookPayload {
  action: 'requested' | 'completed' | 'in_progress';
  workflow_run: {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
    created_at: string;
    updated_at: string;
    run_started_at: string;
  };
}

/**
 * Union type of all supported webhook payloads
 */
export type WebhookPayload =
  | PushEventPayload
  | PullRequestEventPayload
  | PullRequestReviewEventPayload
  | CheckRunEventPayload
  | DeploymentStatusEventPayload
  | IssuesEventPayload
  | IssueCommentEventPayload
  | WorkflowRunEventPayload;

/**
 * GitHub webhook request headers
 */
export interface GitHubWebhookHeaders {
  'x-github-event': string;
  'x-github-delivery': string;
  'x-hub-signature-256': string;
  'content-type': string;
}
