---
name: bework-deployer
description: Automates the BeWork Next.js website deployment to CloudLinux/Passenger via SSH. Use this when the user asks to deploy, publish, or release the website.
---
# BeWork Deployer

This skill handles the complex, multi-step deployment procedure for the BeWork Next.js website to a CloudLinux/Passenger environment via SSH.

## Workflow

When asked to deploy the website, follow these steps:

1. **Inform the user:** Tell the user you are starting the deployment process.
2. **Execute the script:** Run the provided `deploy.sh` script to execute the deployment automatically. The script builds the application, syncs it to the remote server using `rsync`, resolves `node_modules` symlinks, cleans up TypeScript configs, and triggers a Passenger restart.
3. **Verify:** Check the output of the script to ensure it completed successfully.

### Running the deployment

Use the `run_shell_command` tool to execute the deployment script.

```bash
bash scripts/deploy.sh
```

**Important Notes:**
- Do not attempt to run the individual SSH and rsync commands manually, as the `deploy.sh` script is thoroughly tested and contains all required CloudLinux workarounds.
- If the script fails, read the output carefully. If it's a local build error, attempt to fix the Next.js errors. If it's an SSH/network error, ask the user to verify their SSH configuration for the `vh` host.
