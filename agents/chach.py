#!/usr/bin/env python3
import os
import subprocess
import datetime
import urllib.request
import json
import sys

# Daily code review retriever script.
# Fetches all commits and diffs in the last 24 hours.

def get_repo_info():
    try:
        result = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True, check=True)
        url = result.stdout.strip()
        if "github.com" in url:
            # Matches formats:
            # https://github.com/owner/repo.git
            # git@github.com:owner/repo.git
            parts = url.split("github.com")[-1].lstrip(":/").replace(".git", "").split("/")
            if len(parts) >= 2:
                return parts[0], parts[1]
    except Exception as e:
        print(f"Error getting remote info: {e}")
    return None, None

def fetch_via_github_api(owner, repo, token=None):
    # 24 hours ago in UTC ISO format
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat().replace("+00:00", "Z")
    url = f"https://api.github.com/repos/{owner}/{repo}/commits?since={since}"
    
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github.v3+json")
    req.add_header("User-Agent", "Antigravity-Agent")
    if token:
        req.add_header("Authorization", f"token {token}")
        
    try:
        with urllib.request.urlopen(req) as response:
            commits = json.loads(response.read().decode('utf-8'))
            return commits
    except Exception as e:
        print(f"GitHub API request failed: {e}")
        return None

def fetch_via_local_git():
    print("Falling back to local git CLI...")
    since = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    try:
        # Get commit hashes
        log_res = subprocess.run(
            ["git", "log", f"--since={since}", "--pretty=format:%H|%an|%ad|%s"],
            capture_output=True, text=True, check=True, encoding='utf-8'
        )
        if not log_res.stdout.strip():
            return []
            
        commits = []
        for line in log_res.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("|", 3)
            if len(parts) < 4:
                continue
            h, author, date, subject = parts
            
            # Get files changed
            files_res = subprocess.run(
                ["git", "show", "--name-status", "--pretty=format:", h],
                capture_output=True, text=True, check=True, encoding='utf-8'
            )
            files = [f.strip() for f in files_res.stdout.strip().split("\n") if f.strip()]
            
            # Get diff
            diff_res = subprocess.run(
                ["git", "show", "--pretty=format:", h],
                capture_output=True, text=True, check=True, encoding='utf-8'
            )
            
            commits.append({
                "sha": h,
                "commit": {
                    "author": {"name": author},
                    "message": subject
                },
                "files": files,
                "diff": diff_res.stdout
            })
        return commits
    except Exception as e:
        print(f"Local git execution failed: {e}")
        return None

def main():
    print("Retrieving code changes from the last 24 hours...")
    token = os.environ.get("GITHUB_TOKEN")
    owner, repo = get_repo_info()
    
    commits = None
    if owner and repo:
        print(f"GitHub Repository: {owner}/{repo}")
        commits = fetch_via_github_api(owner, repo, token)
        
    if commits is None:
        commits = fetch_via_local_git()
        
    if commits is None:
        print("Failed to retrieve commits from both API and local Git CLI.")
        sys.exit(1)
        
    output_data = {
        "date": datetime.date.today().isoformat(),
        "total_commits": len(commits),
        "commits": []
    }
    
    for c in commits:
        sha = c.get("sha")
        # Handle difference in API response and local git response structures
        if "commit" in c and "author" in c["commit"]:
            author = c["commit"]["author"].get("name", "Unknown")
            message = c["commit"].get("message", "")
        else:
            author = c.get("author", "Unknown")
            message = c.get("message", "")
            
        files = c.get("files", [])
        diff = c.get("diff", "")
        
        # If API-fetched, we might want to get files/diffs if they are not already there
        if not diff and owner and repo and sha:
            # Fetch individual commit details to get diff/files if needed
            detail_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
            req = urllib.request.Request(detail_url)
            req.add_header("Accept", "application/vnd.github.v4.diff") # Get diff format
            req.add_header("User-Agent", "Antigravity-Agent")
            if token:
                req.add_header("Authorization", f"token {token}")
            try:
                with urllib.request.urlopen(req) as response:
                    diff = response.read().decode('utf-8')
            except Exception as e:
                print(f"Failed to fetch diff for commit {sha}: {e}")
                
        output_data["commits"].append({
            "sha": sha,
            "author": author,
            "message": message,
            "files": files,
            "diff": diff
        })
        
    output_path = os.path.join(os.getcwd(), "daily_changes.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {len(commits)} commits. Saved to {output_path}")

if __name__ == "__main__":
    main()
