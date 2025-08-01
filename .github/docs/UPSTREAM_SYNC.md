# Upstream Sync System

Hệ thống tự động sync với upstream repository để luôn cập nhật version mới nhất từ repo gốc.

## 🚀 Tính năng chính

### 1. **Auto Sync Workflow** (`auto-sync-upstream.yml`)

- **Lịch chạy**: Tự động hằng ngày lúc 9:00 sáng JST (00:00 UTC)
- **Trigger thủ công**: Có thể chạy bất cứ lúc nào qua GitHub Actions
- **Tự động build**: Build extension sau khi sync thành công
- **Xử lý conflicts**: Tự động detect và tạo issue khi có conflicts
- **Tạo release**: Tùy chọn tạo release sau khi sync

### 2. **Sync Utilities** (`upstream-sync-utils.yml`)

- **Check upstream**: Kiểm tra trạng thái sync
- **Force sync**: Sync bắt buộc với các strategy khác nhau
- **Resolve conflicts**: Hỗ trợ giải quyết conflicts
- **Create PR**: Tạo Pull Request cho sync
- **Rollback**: Khôi phục về trạng thái trước

### 3. **Helper Script** (`upstream-sync.sh`)

- Script command-line để thao tác sync thủ công
- Hỗ trợ dry-run và verbose mode
- Backup tự động trước khi sync

## 📋 Cách sử dụng

### Tự động (Khuyến nghị)

Workflow sẽ tự động chạy hằng ngày. Bạn chỉ cần:

1. **Kiểm tra kết quả**: Xem Actions tab để theo dõi
2. **Xử lý conflicts**: Nếu có issue được tạo, giải quyết conflicts
3. **Sử dụng extension**: Download từ Artifacts hoặc Releases

### Thủ công qua GitHub Actions

#### 1. Auto Sync Workflow

```yaml
# Trigger thủ công với options
workflow_dispatch:
    inputs:
        upstream_repo: "Kilo-Org/kilocode" # Repo upstream
        target_branch: "main" # Branch target
        create_release: true # Tạo release
        force_sync: false # Force sync
```

**Cách chạy:**

1. Vào **Actions** → **Auto Sync Upstream**
2. Click **Run workflow**
3. Điền các parameters cần thiết
4. Click **Run workflow**

#### 2. Sync Utilities

```yaml
# Các actions có sẵn
actions:
    - "check-upstream" # Kiểm tra status
    - "force-sync" # Sync bắt buộc
    - "resolve-conflicts" # Giải quyết conflicts
    - "rollback-sync" # Rollback
    - "create-sync-pr" # Tạo PR
```

**Cách chạy:**

1. Vào **Actions** → **Upstream Sync Utilities**
2. Click **Run workflow**
3. Chọn action muốn thực hiện
4. Điền parameters
5. Click **Run workflow**

### Thủ công qua Command Line

```bash
# Cấp quyền execute
chmod +x .github/scripts/upstream-sync.sh

# Kiểm tra status
./.github/scripts/upstream-sync.sh check

# Sync với upstream
./.github/scripts/upstream-sync.sh sync

# Force sync với strategy
./.github/scripts/upstream-sync.sh force-sync --strategy theirs

# Dry run (xem trước)
./.github/scripts/upstream-sync.sh sync --dry-run

# Rollback về trước
./.github/scripts/upstream-sync.sh rollback

# Xem help
./.github/scripts/upstream-sync.sh help
```

## ⚙️ Configuration

### Environment Variables

```yaml
# Trong workflow files
env:
    NODE_VERSION: 20.19.2
    PNPM_VERSION: 10.8.1
    UPSTREAM_REPO: "Kilo-Org/kilocode"
    TARGET_BRANCH: "main"
```

### Secrets Required

```yaml
# GitHub repository secrets
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Auto-provided
POSTHOG_API_KEY: ${{ secrets.POSTHOG_API_KEY }} # Optional for build
```

## 🔧 Conflict Resolution

### Automatic Strategies

1. **`ours`**: Giữ changes của chúng ta
2. **`theirs`**: Chấp nhận changes từ upstream
3. **`manual`**: Yêu cầu giải quyết thủ công

### Manual Resolution

Khi có conflicts:

1. **Issue sẽ được tạo** với thông tin chi tiết
2. **Resolve locally**:

    ```bash
    git fetch upstream
    git checkout main
    git merge upstream/main
    # Resolve conflicts in files
    git add .
    git commit -m "Resolve merge conflicts"
    git push origin main
    ```

3. **Hoặc dùng utilities**:
    ```bash
    # Auto-resolve với strategy
    ./.github/scripts/upstream-sync.sh force-sync --strategy theirs
    ```

## 📊 Monitoring & Notifications

### GitHub Actions Summary

Mỗi workflow run sẽ tạo summary với:

- ✅ Sync status
- 📊 Thống kê commits
- 🔗 Download links
- ⚠️ Conflict warnings

### Issues & PRs

- **Conflict Issues**: Tự động tạo khi có conflicts
- **Sync PRs**: Tạo PR thay vì merge trực tiếp (optional)
- **Labels**: `upstream-sync`, `conflict`, `automated`

### Artifacts & Releases

- **Artifacts**: Extension builds (30-90 days retention)
- **Releases**: Tagged releases với extension files
- **Naming**: `upstream-sync-v{version}-{timestamp}`

## 🚨 Troubleshooting

### Common Issues

#### 1. Merge Conflicts

```bash
# Check conflicts
./.github/scripts/upstream-sync.sh check

# Resolve with strategy
./.github/scripts/upstream-sync.sh force-sync --strategy theirs
```

#### 2. Build Failures

```bash
# Check dependencies
pnpm install

# Manual build
pnpm build
```

#### 3. Permission Issues

```bash
# Check GitHub token permissions
# Ensure repository has: contents:write, issues:write, pull-requests:write
```

#### 4. Upstream Access

```bash
# Verify upstream repo
git remote -v
git ls-remote upstream
```

### Recovery Commands

```bash
# Rollback last sync
./.github/scripts/upstream-sync.sh rollback

# Reset to specific backup
git reset --hard origin/backup-before-sync-YYYYMMDD-HHMMSS

# Force push (careful!)
git push --force-with-lease origin main
```

## 📈 Best Practices

### 1. **Regular Monitoring**

- Kiểm tra Actions tab hằng ngày
- Subscribe notifications cho workflow failures
- Review conflict issues ngay lập tức

### 2. **Conflict Prevention**

- Minimize changes trong files dễ conflict (package.json, etc.)
- Use feature branches cho development
- Merge upstream changes thường xuyên

### 3. **Testing**

- Test extension sau mỗi sync
- Verify core functionality
- Check for breaking changes

### 4. **Backup Strategy**

- Backup branches được tạo tự động
- Keep backup branches ít nhất 30 ngày
- Manual backup trước major syncs

## 🔗 Related Workflows

- **Build Extension** (`build-extension.yml`): Build extension manually
- **Build and Release** (`build-and-release.yml`): Create releases
- **Code QA** (`code-qa.yml`): Quality checks

## 📞 Support

Nếu gặp vấn đề:

1. **Check workflow logs** trong Actions tab
2. **Review issues** được tạo tự động
3. **Use helper script** để debug local
4. **Create manual issue** nếu cần hỗ trợ

---

**Auto-generated documentation for Upstream Sync System**
