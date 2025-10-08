import fs from "fs"
import path from "path"
import readline from "readline"

const APPROVALS_DIR = "approvals"

export interface ApprovalResult {
	isApproved: boolean
	newOutput: boolean
}

function getCategoryPath(category: string): string {
	return path.join(APPROVALS_DIR, category)
}

function getNextFileNumber(categoryDir: string, testName: string, type: "approved" | "rejected"): number {
	if (!fs.existsSync(categoryDir)) {
		return 1
	}

	const files = fs.readdirSync(categoryDir)
	const pattern = new RegExp(`^${testName}\\.${type}\\.(\\d+)\\.txt$`)
	const numbers = files
		.filter((f) => pattern.test(f))
		.map((f) => {
			const match = f.match(pattern)
			return match ? parseInt(match[1], 10) : 0
		})

	return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
}

function findMatchingFile(
	categoryDir: string,
	testName: string,
	type: "approved" | "rejected",
	content: string,
): string | null {
	if (!fs.existsSync(categoryDir)) {
		return null
	}

	const pattern = new RegExp(`^${testName}\\.${type}\\.\\d+\\.txt$`)
	const files = fs.readdirSync(categoryDir).filter((f) => pattern.test(f))

	for (const file of files) {
		const filePath = path.join(categoryDir, file)
		const fileContent = fs.readFileSync(filePath, "utf-8")
		if (fileContent.trim() === content.trim()) {
			return file
		}
	}

	return null
}

async function askUserApproval(category: string, testName: string, input: string, output: string): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise((resolve) => {
		console.log("\n" + "═".repeat(80))
		console.log(`\n🔍 New output detected for: ${category}/${testName}\n`)
		console.log("Input:")
		console.log("─".repeat(80))
		console.log(input)
		console.log("─".repeat(80))
		console.log("\nOutput:")
		console.log("─".repeat(80))
		console.log(output)
		console.log("─".repeat(80))
		console.log("\n" + "─".repeat(80))

		rl.question("\nIs this acceptable? (y/n): ", (answer) => {
			rl.close()
			resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
		})
	})
}

export async function checkApproval(
	category: string,
	testName: string,
	input: string,
	output: string,
): Promise<ApprovalResult> {
	const categoryDir = getCategoryPath(category)

	const approvedMatch = findMatchingFile(categoryDir, testName, "approved", output)
	if (approvedMatch) {
		return { isApproved: true, newOutput: false }
	}

	const rejectedMatch = findMatchingFile(categoryDir, testName, "rejected", output)
	if (rejectedMatch) {
		return { isApproved: false, newOutput: false }
	}

	const isApproved = await askUserApproval(category, testName, input, output)

	const type: "approved" | "rejected" = isApproved ? "approved" : "rejected"

	fs.mkdirSync(categoryDir, { recursive: true })

	const nextNumber = getNextFileNumber(categoryDir, testName, type)
	const filename = `${testName}.${type}.${nextNumber}.txt`
	const filePath = path.join(categoryDir, filename)

	fs.writeFileSync(filePath, output, "utf-8")

	return { isApproved, newOutput: true }
}
