# Wildcard Calculator

A web tool with a Japanese interface that lists matching IPv4 addresses in ascending order from a network address and a wildcard mask. It uses only HTML, CSS, and JavaScript, with no server-side processing, external libraries, or external fonts. Input data stays in your browser.

Live site: <https://kakkotetsu.github.io/wildcard-mask-calculator/>

## Example

Network address: `192.168.1.0`  
Wildcard mask: `0.0.0.12`

```text
192.168.1.0
192.168.1.4
192.168.1.8
192.168.1.12
```

## How matching works

- A **0 bit in the mask must match the corresponding input address bit**. A **1 bit can be either 0 or 1**. Non-contiguous masks are supported.
- The matching rule is `(candidate & ~wildcard) === (inputAddress & ~wildcard)`.
- Matching follows Cisco ACL semantics: only the IPv4 address and wildcard mask determine the result. No CIDR suffix is accepted, and no subnet boundary restricts matching. For example, `192.168.1.0` with `0.0.1.0` matches `192.168.0.0` and `192.168.1.0`.
- The ACL address condition shown in the results contains the address with all wildcard bits cleared, followed by the wildcard mask. This pair can be used as an ACL source or destination address condition. The tool does not generate a complete ACL command.
- A mask of `0.0.0.0` matches a single address, equivalent to `host`. A mask of `255.255.255.255` matches every IPv4 address, equivalent to `any`. Enter dotted-decimal IPv4 values rather than these keywords.
- The input may include nonzero host bits. All bits marked as fixed by the mask are preserved. For example, `192.168.1.10` with `0.0.0.12` matches addresses ending in `.2`, `.6`, `.10`, and `.14`.
- Network and broadcast addresses are included. The tool does not check whether an address can be assigned to a host.
- IPv4 octets with leading zeros, such as `001`, are rejected to avoid ambiguous interpretations.
- Results are displayed in pages of 256 addresses. Even when all 4,294,967,296 IPv4 addresses match, only the requested page is generated in memory.
- You can copy the current page. Downloading all results as a TXT file is available for up to 65,536 addresses to limit browser resource usage.
- Clipboard access requires HTTPS or localhost. If browser permissions prevent copying, select and copy the addresses manually.

## Run locally

With Python 3 installed, run this command from the repository root:

```sh
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000` in your browser. The application uses JavaScript modules, so serve it over HTTP instead of opening the HTML file directly with `file://`.

## Current deployment

Source code is stored on the `main` branch. GitHub Pages is configured through **Settings → Pages → Source → GitHub Actions**. Only the HTML, CSS, and JavaScript under `site/` are deployed. The `.env` file is excluded.

Every push to `main` runs the automated tests and deploys the site if they pass. Pull requests run the tests without deploying.

## Set up GitHub Pages in another repository

1. Create a GitHub repository for the site. Use a public repository for GitHub Pages on a free plan.
2. Add this project to the repository's `main` branch, including **`.github/workflows/pages.yml`**. If you upload using a classic personal access token, it needs the `repo` and `workflow` scopes.
3. In the repository, select **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Open **Actions → Test and deploy to GitHub Pages → Run workflow**, select **main**, and run the workflow. Future pushes to `main` will automatically run the tests and deploy the site.
5. Once the workflow succeeds, the site URL appears in Settings → Pages and in the deployment job. It is usually `https://<username>.github.io/<repository>/`.

If you use Git or the GitHub CLI, configure the remote repository and authentication separately. Check for existing files before adding this project to an existing repository.

For other static hosting providers, set the publish directory to `site` and leave the build command empty.

## Tests

Run with Node.js 22 or later. No `npm install` is required.

```sh
npm test
```

Tests cover the four-address example, non-contiguous masks, fixed host bits, matching across octets, single-address and all-IPv4 matches, the 32-bit sign boundary, invalid input, and pagination. All 256 possible masks in the last octet are checked against an independent matching predicate applied to every candidate value.

## Files

- `site/index.html`: Japanese user interface
- `site/styles.css`: Desktop and mobile styles
- `site/calculator.js`: IPv4 calculation logic
- `site/app.js`: Input handling, pagination, clipboard access, and TXT downloads
- `tests/calculator.test.js`: Automated calculation tests
- `.github/workflows/pages.yml`: Tests and automatic deployment to GitHub Pages
