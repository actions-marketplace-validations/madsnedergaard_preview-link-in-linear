<h1 align="center">Preview links in Linear</h1>
<p align="center">Make it easy to access your preview environments in Linear with this GitHub Action.</p>

<div align="center">

![Preview in Linear Action](./screenshot.png)

</div>

## Usage

```yaml
name: Preview Links in Linear
# Run action when a new comment is added to a pull request (as we are expecting a Linear-bot comment with a link to the Linear issue)
# and/or on deployment status changes if using a provider that supports it (Vercel, Fly, custom setup)
on: [issue_comment, deployment_status]

jobs:
    preview-links-in-linear:
        name: Preview Links in Linear
        runs-on: ubuntu-latest
        steps:
            - name: Checkout
              uses: actions/checkout@v4
            - name: Attach preview link to Linear issue
              uses: madsnedergaard/preview-link-in-linear@main
              with:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                  LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
```

> [!IMPORTANT]
> This project is still in early development, so please create an issue if you encounter any problems or have any feedback. PRs are also welcome!

### Configuration

**Linear API key**

Create a new Personal API key here: https://linear.app/{YOUR_ORGANIZATION}/settings/account/security

**Provider**

The action will detect a provider automatically, but you can also manually specify one:

```yaml
with:
    provider: vercel # or netlify, cloudflare, github-deployments
```

## How it works

1. The action is triggered when a new comment is added to a pull request (as we are expecting a Linear-bot comment with a link to the Linear issue)
2. It finds GitHub deployments or preview links in comments on the pull request
3. It finds the Linear issue associated with the pull request from the comment
4. It attaches the preview link to the Linear issue 🪄

### Supported providers

The following providers have been tested and verified to work:

- Vercel
- Netlify
- Cloudflare
- Fly (using [the action in their guide](https://fly.io/docs/blueprints/review-apps-guide/))
- Any custom setup that uses GitHub Deployments

Need something else? Feel free to open an issue or make a PR to add support for it.
