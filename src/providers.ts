import { debug, getInput, info } from '@actions/core';
import { getGitHubDeploymentData } from './github';

const providers = {
    netlify: {
        author: 'netlify[bot]',
        urlPattern: 'Deploy Preview.*?\\]\\((https://[^)]+\\.netlify\\.app)\\)',
    },
    cloudflare: {
        author: 'cloudflare-workers-and-pages[bot]',
        urlPattern: "Branch Preview URL[\\s\\S]*?href='(https://[^']+\\.pages\\.dev)'",
    },
    vercel: {
        author: 'vercel[bot]',
        urlPattern: '\\[Preview\\]\\((https://[^)]+\\.vercel\\.app)\\)',
    },
};

export const supportedProviders = ['vercel', 'netlify', 'cloudflare', 'github-deployments', 'fly'] as const;

export async function getProvider(comments: any[], ghIssueNumber: number) {
    const inputProvider = getInput('provider') as (typeof supportedProviders)[number] | undefined;

    if (inputProvider) {
        if (!supportedProviders.includes(inputProvider)) {
            throw new Error(`Unsupported provider: ${inputProvider}`);
        }
        debug(`Using provider: ${inputProvider}`);
        return inputProvider;
    }

    debug('No provider specified, attempting auto-detection...');
    const detectedProvider = await detectProvider(comments, ghIssueNumber);
    if (!detectedProvider) {
        throw new Error('Could not auto-detect provider. Please specify the provider input.');
    }
    debug(`Auto-detected provider: ${detectedProvider}`);
    return detectedProvider;
}

export async function detectProvider(
    comments: any[],
    ghIssueNumber: number,
): Promise<(typeof supportedProviders)[number] | null> {
    // Check comment-based providers first (most reliable)
    for (const comment of comments) {
        const author = comment.user?.login;
        if (author === 'netlify[bot]') {
            return 'netlify';
        }
        if (author === 'cloudflare-workers-and-pages[bot]') {
            return 'cloudflare';
        }
        if (author === 'vercel[bot]') {
            return 'vercel';
        }
    }

    // Check GitHub deployments (covers vercel, github-deployments, and fly)
    const deploymentData = await getGitHubDeploymentData(ghIssueNumber);
    if (deploymentData) {
        debug('Auto-detected provider: github-deployments (from GitHub deployment API)');
        return 'github-deployments';
    }

    return null;
}

export async function getPreviewDataByProvider(
    provider: (typeof supportedProviders)[number],
    ghIssueNumber: number,
    comments: any[],
): Promise<{ url: string; avatar: string | undefined } | null> {
    if (['github-deployments', 'vercel', 'fly'].includes(provider)) {
        return await getGitHubDeploymentData(ghIssueNumber);
    }
    if (provider === 'netlify') {
        return await getPreviewDataFromComments(comments, provider);
    }
    if (provider === 'cloudflare') {
        return await getPreviewDataFromComments(comments, provider);
    }
    return null;
}
export async function getPreviewDataFromComments(comments: any[], provider: keyof typeof providers) {
    for (const comment of comments) {
        if (comment.user?.login === providers[provider].author) {
            const link = comment.body?.match(new RegExp(providers[provider].urlPattern))?.[1];
            info(`Found ${provider} preview link: ${link}`);
            if (link) {
                return { url: link, avatar: comment.user?.avatar_url };
            } else {
                console.error(`No ${provider} link found in the comment`);
                return null;
            }
        }
    }
    console.error(`No ${provider} link found in the comments`);
    return null;
}
