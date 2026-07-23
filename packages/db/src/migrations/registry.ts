import * as initial from './001_initial'
import * as feedback from './002_feedback'
import * as feedbackIssue from './003_feedback_issue'
import * as inboxMetadata from './004_inbox_metadata'
import * as privateDataRls from './005_private_data_rls'
import * as feedbackRls from './006_feedback_rls'
import * as training from './007_training'
export const migrations = [initial, feedback, feedbackIssue, inboxMetadata, privateDataRls, feedbackRls, training]
