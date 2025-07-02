import { hash } from "bcryptjs";

async function generateHash() {
    const password = "Alan6716";
    const hashedPassword = await hash(password, 10);
    console.log("Hashed password:", hashedPassword);
}

generateHash().catch(console.error); 