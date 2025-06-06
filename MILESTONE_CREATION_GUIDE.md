# 📋 GitHub Milestone Creation Guide

## 🎯 Overview
This guide explains how to create GitHub milestones that will be automatically categorized by the Freelance Tracker application.

## 🔧 Automatic Detection Rules

The application automatically detects milestone types based on **title prefixes**:

- **`[AUGMENT]`** - AI-assisted development tasks
- **`[MANUAL]`** - Traditional manual development tasks
- **No prefix** - Will be marked as `UNCATEGORIZED` (requires manual selection)

## 📝 Milestone Naming Convention

### ✅ Correct Format:
```
[AUGMENT] Feature description here
[MANUAL] Task description here
```

### ❌ Incorrect Format:
```
AUGMENT: Feature description    ← Missing brackets
[AUGMENT Feature description    ← Missing closing bracket
Feature description [AUGMENT]   ← Prefix not at start
```

## 🎯 Example Milestones

### AUGMENT Milestone
**Title:** `[AUGMENT] Feature change style to use shadcn`
**Description:**
```markdown
## Description
Implement a comprehensive style change to use shadcn/ui components throughout the application.

## Tasks
- [ ] Audit current UI components
- [ ] Install and configure shadcn/ui
- [ ] Replace form components
- [ ] Update navigation and layout components
- [ ] Replace data display components (tables, cards, etc.)
- [ ] Update color scheme and typography
- [ ] Test responsive design

## Type
AUGMENT - AI-assisted development milestone
```

### MANUAL Milestone
**Title:** `[MANUAL] Implement CI/CD pipeline`
**Description:**
```markdown
## Description
Set up a complete CI/CD pipeline for automated testing, building, and deployment.

## Tasks
- [ ] Create GitHub Actions workflow files
- [ ] Set up automated testing
- [ ] Configure build pipeline for Next.js application
- [ ] Set up Docker image building and pushing
- [ ] Implement deployment to staging environment
- [ ] Configure production deployment workflow

## Type
MANUAL - Traditional development milestone requiring manual implementation
```

### UNCATEGORIZED Milestone (for testing)
**Title:** `Fix milestone categorization and naming convention`
**Description:**
```markdown
This milestone demonstrates an invalid categorization that needs to be corrected.
The system will mark this as UNCATEGORIZED and require manual type selection.
```

## 🚀 How to Create Milestones

1. **Navigate to GitHub Repository**
   ```
   https://github.com/[username]/[repository]/milestones
   ```

2. **Click "Create a milestone"**

3. **Enter Title with Correct Prefix**
   - Use `[AUGMENT]` for AI-assisted tasks
   - Use `[MANUAL]` for traditional development tasks
   - Leave no prefix to test UNCATEGORIZED behavior

4. **Add Description** (optional but recommended)

5. **Set Due Date** (optional)

6. **Click "Create milestone"**

## 🔄 Application Behavior

### When Repository is Selected:
1. Application fetches all milestones via GitHub API
2. Automatically categorizes based on title prefix
3. Shows appropriate input fields:
   - **AUGMENT**: "Estimated Messages" field
   - **MANUAL**: "Fixed Price" field  
   - **UNCATEGORIZED**: Type selector dropdown

### Pricing Calculation:
- **AUGMENT**: `Estimated Messages × AI Message Rate`
- **MANUAL**: `Fixed Price (as entered)`
- **UNCATEGORIZED**: No calculation until type is selected

## ⚠️ Important Notes

- **Prefix must be at the start** of the title
- **Use square brackets** `[AUGMENT]` not `(AUGMENT)` or `AUGMENT:`
- **Case sensitive** - use uppercase `AUGMENT` and `MANUAL`
- **Space after bracket** - `[AUGMENT] Title` not `[AUGMENT]Title`

## 🧪 Testing the System

Create these three milestones to test all scenarios:

1. `[AUGMENT] Test AI-assisted milestone`
2. `[MANUAL] Test manual development milestone`  
3. `Test uncategorized milestone` (no prefix)

Then import the repository in the Freelance Tracker to verify automatic categorization works correctly.

## 🔧 Troubleshooting

**Milestone shows as UNCATEGORIZED when it shouldn't:**
- Check title starts with exact prefix `[AUGMENT]` or `[MANUAL]`
- Verify no extra characters before the bracket
- Ensure proper spacing after bracket

**Changes not reflected in application:**
- Refresh the repository selection in the app
- Check GitHub API rate limits
- Verify GitHub token has proper permissions
