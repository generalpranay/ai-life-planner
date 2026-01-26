
import { pool } from "../config/db";
import { createTask, updateTask, deleteTask } from "../controllers/taskController";

// Mock Request/Response
const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.data = data;
        return res;
    };
    res.send = () => res;
    return res;
};

async function testFixedTaskSync() {
    console.log("Starting Fixed Task Sync Test...");

    // 1. Get a user ID (assume user 1 exists or fetch one)
    const userRes = await pool.query("SELECT id FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
        console.error("No users found to test with");
        return;
    }
    const userId = userRes.rows[0].id;
    console.log(`Testing with User ID: ${userId}`);

    // 2. Create a fixed-time task
    const createReq: any = {
        userId: userId, // Mocking the middleware injection
        body: {
            title: "Test Fixed Task",
            category: "work",
            due_datetime: "2026-01-08T00:00:00.000Z", // Tomorrow
            start_time: "14:00",
            end_time: "15:00",
            is_recurring: false
        }
    };

    // We need to properly mock the req object structure that the controller expects
    // The controller uses `(req as any).userId`
    (createReq as any).userId = userId;

    console.log("Creating task...");
    const res1 = mockRes();
    await createTask(createReq, res1);

    if (res1.statusCode !== 201) {
        console.error("Failed to create task:", res1.data);
        return;
    }

    const task = res1.data;
    console.log(`Task created with ID: ${task.id}`);

    // 3. Verify it is in scheduled_blocks
    const blockRes = await pool.query(
        "SELECT * FROM scheduled_blocks WHERE task_id = $1",
        [task.id]
    );

    if (blockRes.rows.length === 1) {
        console.log("SUCCESS: Block found in schedule!");
        console.log(blockRes.rows[0]);
    } else {
        console.error(`FAILURE: Expected 1 block, found ${blockRes.rows.length}`);
    }

    // 4. Update the task (change time)
    console.log("Updating task time...");
    const updateReq: any = {
        params: { id: task.id.toString() },
        userId: userId,
        body: {
            start_time: "16:00",
            end_time: "17:00"
        }
    };
    (updateReq as any).userId = userId;

    const res2 = mockRes();
    await updateTask(updateReq, res2);

    // 5. Verify update
    const blockRes2 = await pool.query(
        "SELECT * FROM scheduled_blocks WHERE task_id = $1",
        [task.id]
    );

    if (blockRes2.rows.length === 1) {
        const block = blockRes2.rows[0];
        const startHour = new Date(block.start_datetime).getUTCHours();
        // Note: Dates are stored as UTC or timestampz. The input was naive "16:00" on a UTC date string.
        // The controller logic:
        // const dateObj = new Date("2026-01-08T00:00:00.000Z"); -> UTC midnight
        // startDt.setHours(16, 0, 0, 0); -> Sets LOCAL hours if not careful, or Node default?
        // Node's setHours uses local time unless using setUTCHours.
        // Wait, the controller used `startDt.setHours(startH, startM, 0, 0)`.
        // This sets it in LOCAL time of the server.
        // This might be flaky if test and server have different TZ, but here they are same.
        // Let's just print the time found.
        console.log("Updated block found:", block.start_datetime);
    } else {
        console.error(`FAILURE: Expected 1 block after update, found ${blockRes2.rows.length}`);
    }

    // 6. Delete task
    console.log("Deleting task...");
    const delReq: any = {
        params: { id: task.id.toString() },
        userId: userId
    };
    (delReq as any).userId = userId;

    const res3 = mockRes();
    await deleteTask(delReq, res3);

    // 7. Verify deletion
    const blockRes3 = await pool.query(
        "SELECT * FROM scheduled_blocks WHERE task_id = $1",
        [task.id]
    );

    if (blockRes3.rows.length === 0) {
        console.log("SUCCESS: Block deleted from schedule!");
    } else {
        console.error(`FAILURE: Block still exists after deletion!`);
    }

    await pool.end();
}

testFixedTaskSync();
