# 🔍 GitHub Actions Monitoring & Auto-Debug System

Hệ thống tự động theo dõi và debug GitHub Actions workflows, phát hiện lỗi và tự động áp dụng fixes.

## 🎯 Tính năng chính

### 📊 **Monitoring tự động**

- Chạy mỗi 6 tiếng để kiểm tra workflow runs
- Phân tích logs của các workflow bị lỗi
- Tạo reports chi tiết về trạng thái workflows
- Theo dõi success rate của từng workflow

### 🔧 **Auto-Fix System**

- Database các lỗi phổ biến và cách sửa
- Tự động áp dụng fixes cho các lỗi đã biết
- Tạo branches và commits cho fixes
- Suggest manual steps cho lỗi phức tạp

### 🚨 **Alert System**

- Tự động tạo GitHub Issues khi phát hiện lỗi
- Update issues với thông tin mới
- Đóng issues khi lỗi đã được sửa
- Notifications qua GitHub

## 🏗️ Cấu trúc hệ thống

```
scripts/
├── actions-monitor.py      # Main monitoring script
├── auto-fix.py            # Auto-fix system
└── error-patterns.json    # Database of known errors

.github/workflows/
└── monitor-actions.yml    # Monitoring workflow

docs/
└── ACTIONS_MONITORING.md  # Documentation (this file)
```

## 🚀 Cách sử dụng

### **1. Monitoring tự động**

Workflow chạy tự động mỗi 6 tiếng. Không cần can thiệp thủ công.

### **2. Chạy monitoring thủ công**

```bash
# Vào Actions tab → Monitor GitHub Actions → Run workflow
# Hoặc sử dụng GitHub CLI:
gh workflow run monitor-actions.yml
```

### **3. Chạy monitoring local**

```bash
# Set environment variables
export GITHUB_TOKEN="your-token"
export GITHUB_REPOSITORY="thubv/kilocode"

# Run monitor
cd scripts
python actions-monitor.py

# Apply auto-fixes
python auto-fix.py workflow-monitor-results.json
```

## 🔍 Các loại lỗi được detect

### ✅ **Auto-fixable errors:**

1. **Tag Conflicts**

    - `! [rejected] v4.63.1 -> v4.63.1 (would clobber existing tag)`
    - **Fix:** Thêm `--force` flag cho git tag operations

2. **Node Modules Issues**

    - `npm ERR! peer dep missing`
    - **Fix:** Clear cache và reinstall dependencies

3. **Build Timeouts**

    - `exceeded the maximum execution time`
    - **Fix:** Tăng timeout hoặc optimize build

4. **Disk Space Issues**

    - `No space left on device`
    - **Fix:** Clean up disk space trước khi build

5. **Network Timeouts**
    - `connect ETIMEDOUT`
    - **Fix:** Retry với exponential backoff

### ⚠️ **Manual-fix required:**

1. **Missing Environment Variables**

    - `OPENROUTER_API_KEY environment variable is not set`
    - **Action:** Thêm secret vào repository settings

2. **Permission Issues**

    - `Permission denied`
    - **Action:** Kiểm tra token permissions

3. **Test Failures**

    - `Test suite failed to run`
    - **Action:** Fix failing tests

4. **Syntax Errors**
    - `SyntaxError: Unexpected token`
    - **Action:** Fix code syntax issues

## 📊 Monitoring Reports

### **JSON Results** (`workflow-monitor-results.json`)

```json
{
	"timestamp": "2025-08-01T10:00:00Z",
	"total_runs": 25,
	"failed_runs": 3,
	"successful_runs": 22,
	"errors_found": [
		{
			"error_type": "tag_conflicts",
			"workflow_name": "Auto Sync Upstream",
			"description": "Git tag conflicts when fetching from upstream",
			"fix": "Add --force flag to git fetch and push commands",
			"auto_fixable": true,
			"run_url": "https://github.com/thubv/kilocode/actions/runs/123456"
		}
	],
	"summary": {
		"Auto Sync Upstream": { "total": 5, "failed": 1, "success": 4 },
		"Build Extension": { "total": 10, "failed": 0, "success": 10 }
	}
}
```

### **Markdown Report** (`workflow-monitor-report.md`)

```markdown
# 🔍 GitHub Actions Monitoring Report

**Generated:** 2025-08-01T10:00:00Z
**Repository:** thubv/kilocode

## 📊 Summary

- **Total Runs:** 25
- **✅ Successful:** 22
- **❌ Failed:** 3
- **📈 Success Rate:** 88.0%

## 🔧 Workflow Breakdown

- **✅ Build Extension:** 10/10 (100.0%)
- **⚠️ Auto Sync Upstream:** 4/5 (80.0%)

## 🚨 Errors Found

### 1. Auto Sync Upstream - tag_conflicts

**Description:** Git tag conflicts when fetching from upstream
**Fix:** Add --force flag to git fetch and push commands
**Auto-fixable:** ✅ Yes
```

## 🔧 Configuration

### **Error Patterns** (`error-patterns.json`)

Thêm patterns mới cho các lỗi khác:

```json
{
	"new_error_type": {
		"description": "Description of the error",
		"patterns": ["regex pattern 1", "regex pattern 2"],
		"fix": "How to fix this error",
		"auto_fixable": true,
		"workflow_fixes": {
			"workflow-file.yml": {
				"search": "text to find",
				"replace": "text to replace with"
			}
		}
	}
}
```

### **Workflow Settings**

Customize monitoring frequency trong `.github/workflows/monitor-actions.yml`:

```yaml
on:
    schedule:
        # Change frequency (currently every 6 hours)
        - cron: "0 */6 * * *"
```

## 🎯 Best Practices

### **1. Regular Monitoring**

- Kiểm tra monitoring reports hằng ngày
- Review GitHub Issues được tạo tự động
- Update error patterns khi gặp lỗi mới

### **2. Auto-Fix Management**

- Review auto-fix branches trước khi merge
- Test fixes trong development environment
- Update patterns database với lỗi mới

### **3. Manual Intervention**

- Xử lý manual-fix issues ngay lập tức
- Document solutions cho lỗi phức tạp
- Update monitoring system với lessons learned

## 🚨 Troubleshooting

### **Monitoring không chạy**

1. Kiểm tra workflow permissions
2. Verify GITHUB_TOKEN có đủ scopes
3. Check repository settings cho Actions

### **Auto-fix không hoạt động**

1. Kiểm tra error patterns có match không
2. Verify workflow files tồn tại
3. Check Git configuration trong workflow

### **Issues không được tạo**

1. Kiểm tra GitHub CLI authentication
2. Verify repository permissions
3. Check issue creation logic

## 📈 Metrics & Analytics

Hệ thống track các metrics sau:

- **Success Rate:** % workflows thành công
- **Error Frequency:** Tần suất các loại lỗi
- **Fix Effectiveness:** % lỗi được auto-fix thành công
- **Response Time:** Thời gian từ lỗi đến fix

## 🔄 Continuous Improvement

1. **Weekly Reviews:** Analyze monitoring reports
2. **Pattern Updates:** Add new error patterns
3. **Fix Optimization:** Improve auto-fix logic
4. **Documentation:** Keep docs updated

---

**🤖 Hệ thống này giúp bạn:**

- ✅ Phát hiện lỗi workflow sớm
- ✅ Tự động sửa các lỗi phổ biến
- ✅ Giảm thời gian debug manual
- ✅ Maintain workflow health tốt hơn
- ✅ Focus vào development thay vì troubleshooting
