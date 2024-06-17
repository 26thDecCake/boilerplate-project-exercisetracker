const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new Schema({
  username: String,
});
const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
})

const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);


app.use(cors())
app.use(express.static('public'))

app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("username _id");
  if (!users) {
    res.send("No acive users");
  } else {
    const usersMap = users.map(e => ({
      username: e.username,
      _id: e._id
    }))

    res.json(usersMap);
  }
})


app.post("/api/users", async (req, res) => {
  const userObj = new User({
    username: req.body.username,
  })

  try {
    const user = await userObj.save();

    res.json({
      username: user.username,
      _id: user._id
    });
  } catch (error) {
    console.log(error);
    res.send("Error encountered.");
  }
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);

    if(!user) {
      res.send("User not found.")
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date? new Date(date) : new Date()
      }) 

      const exercise = await exerciseObj.save();

      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      });
    }

  } catch (error) {
    console.log(error);
    res.send("Error encountered.");
  }
})



app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);

  if(!user) {
    res.send("User not found.");
    return;
  } else {
    let dateObj = {}
    let filter = {
      user_id: id
    };

    if(from) {
      dateObj["$gte"] = new Date(from);
    }
    if(to) {
      dateObj["$lte"] = new Date(to);
    }
    if(from || to) {
      filter.date = dateObj;
    }

    const exercises = await Exercise.find(filter).limit(+limit ?? 500);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }))

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  }
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
