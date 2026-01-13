import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import connectDB from "./db/index.js";
import { app } from "./app.js";
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    app.on("error", (error) => {
      console.log("App error: ", error);
      throw error;
    });
    app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`MONGODB Connection Failed: ${err}`);
  });

// (async ()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     } catch (error) {
//         console.log("Error: ",error);
//         throw error

//     }
// })()
