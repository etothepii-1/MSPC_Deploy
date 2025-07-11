const express = require('express');
const session = require('express-session');
const path = require('path');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const mongoUrl = process.env.MONGODB_CONNECTION;
app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    store: MongoStore.create({ mongoUrl }),
  })
);

app.get('/', async (req, res) => {
  try {
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('index', { loggedIn, userId, userRole, contests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const userSchema = new mongoose.Schema({
  name: String,
  sub: String,
  id: String,
  role: String,
  totalScore: Number,
  scoreUpdate: Date,
  problemScore: Map,
  language: String,
});
const User = mongoose.model('User', userSchema);

app.post('/user-register', async (req, res) => {
  try {
    const { userName, userSub } = req.body;
    let user = await User.findOne({ sub: userSub }, { _id: 0, __v: 0 });
    if (!user) {
      const newUser = new User({
        name: userName,
        sub: userSub,
        id: userName,
        role: '',
        totalScore: 0,
        scoreUpdate: new Date(),
        problemScore: {},
        language: 'c',
      });
      await newUser.save();
      user = await User.findOne({ sub: userSub }, { _id: 0, __v: 0 });
    }
    req.session.userData = user;
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/logout', (req, res) => {
  try {
    req.session.destroy((error) => {
      if (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const problemSchema = new mongoose.Schema({
  id: Number,
  title: String,
  description: String,
  input: String,
  output: String,
  sampleInput: [String],
  sampleOutput: [String],
  timeLimit: Number,
  score: Number,
});
const Problem = mongoose.model('Problem', problemSchema);
const problem = new Problem({
  id: 1,
  title: '끌어당기는 자석쌍',
  description: '1차원 선 위에 $N$개의 자석이 있다. 자석은 + 또는 - 중 하나이며, 빈칸은 .으로 표시된다.\n자석은 다음 규칙에 따라 서로 끌어당긴다:\n- 인접한 두 자석이 서로 다른 극(+- 또는 -+)이면, 그 둘은 서로 끌어당기는 쌍이다.\n- 인접한 두 자석이 같은 극(++ 또는 --)이거나 자석과 빈칸(+. 또는 -. 또는 .+ 또는 .-)이라면 아무  일도 일어나지 않는다.\n자석 문자열이 주어질 때, 끌어당기는 자석 쌍의 수를 출력하시오.',
  input: '첫번째 줄에 +, -, .로만 구성된 길이가 $S(1\leq S\leq 1000)$인 문자열이 주어진다.',
  output: '끌어당기는 자석 쌍의 총 개수를 출력한다.',
  sampleInput: ['+-.-+--+.'],
  sampleOutput: ['4'],
  timeLimit: 1,
  score: 60,
});
//problem.save();

const testdataSchema = new mongoose.Schema({
  id: Number,
  input: [String],
  output: [String],
  timeLimit: String,
});
const Testdata = mongoose.model('Testdata', testdataSchema);
const testdata = new Testdata({
  id: 1,
  input: ['+-.-+--+.','..-+---...-+.--..-+-+.+-++..+.+-+.++.+.+-.-..--+.+...--.+-+--.--.+-..-----+-.--...---+++-.+---+...+..-+.---.-+....--++-+--....+-.-.+--+.-.-++..++-+--.+--.-+..++...-+.+++..-.-..-.-.+.-+.+..-+..+.-.-+-+-+-.+.-.++.-..+++++.----+-+-+.+-++...--...-++-.++---..++++---.+-.-.+-....-.+---.+-++++.++++.-+-.+-..-...-------+.------.+.++.+-.+++-.-..--+--..+-.-+.-+.++--.-++-+.-.------+.-+-+.-.--..+---++++.-++.-.--+..+..--+.-..-.-+..+++++++.++-.-+-+-++.-.-++..++.--.+--+-++-+--.-.+.++-.-.--.+-+...-...-+-++.+---+-+++---.--+.-.-+.-+..---+-+-+.+..++..---+-.++-.-+.+--....-+.+...++..-+.--...+...+.-.+--.+..++--+--+.+++.++---.-.+.-+.-+.--+++-+.+-+.-.-+.++.+++-.---.+-+--+-....-+..----..-++-.-.-++.+-..---.+.---++-...+.-..++++.+..-++.-+.....+---+--.---.-+.-+--..+...+++---+-+..+.--+-+.-..-.+...-+.-++..-++.-+..-.+.---.-.+-.-++-.+----+++--.-..--+..++-.-++-....--...---.-+.-..+--+.+.+--+++-----+-.++-+---+..+-..-.++-.+.-..+.+.--++-++--...-++++--++.+..++..+--.+--.++---+-+.++-++....-+-.-+--.-..-++---+..+---.+-+--+-++-+.+'],
  output: ['4','228'],
  timeLimit: '1',
});
//testdata.save();

app.get('/problems', async (req, res) => {
  try {
    const currentDate = new Date();
    const startDate = new Date(process.env.START_DATE);
    let problems;
    if (currentDate >= startDate) {
      problems = await Problem.find(
        {},
        { _id: 0, id: 1, title: 1, score: 1 }
      ).sort({ id: 1 });
    } else {
      problems = false;
    }
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userTotalScore = req.session.userData?.totalScore;
    const userProblemScores = req.session.userData?.problemScore;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('problems', {
      loggedIn,
      userId,
      userTotalScore,
      problems,
      userProblemScores,
      userRole,
      contests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const baseUrl = process.env.JUDGE0_BASE_URL || 'http://localhost:2358';
app.get('/problems/:id', async (req, res) => {
  try {
    const currentDate = new Date();
    const startDate = new Date(process.env.START_DATE);
    let problem;
    if (currentDate >= startDate) {
      const id = req.params.id;
      problem = await Problem.findOne({ id }, { _id: 0, __v: 0 });
    } else {
      problem = false;
    }
    const loggedIn = req.session.userData !== undefined;
    let userProblemScore;
    try {
      const userProblemScores = req.session.userData.problemScore;
      const problemScoresMap = new Map(Object.entries(userProblemScores));
      userProblemScore = problemScoresMap.get(`${problem.id}`) ?? 0;
    } catch {
      userProblemScore = 0;
    }
    const userId = req.session.userData?.id;
    const userLanguage = req.session.userData?.language;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('problem', {
      loggedIn,
      userId,
      userProblemScore,
      problem,
      userLanguage,
      userRole,
      contests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const submissionSchema = new mongoose.Schema({
  userName: String,
  problemId: Number,
  code: String,
  language: Number,
  status: Number,
  date: Date,
});
const Submission = mongoose.model('Submission', submissionSchema);

app.post('/submit', async (req, res) => {
  try {
    const { problemId, language, code } = req.body;
    const problem = await Problem.findOne({ id: problemId }, { _id: 0, __v: 0 });
    const problemScore = problem.score;
    const user = req.session.userData;
    let userProblemScores;
    try {
      userProblemScores = new Map(Object.entries(user.problemScore));
    } catch {
      userProblemScores = new Map();
    }
    const userProblemScore = userProblemScores.get(problemId) ?? 0;
    const testdata = await Testdata.findOne({ id: problemId }, { _id: 0, __v: 0 });
    const submissions = {
      submissions: testdata.input.map((stdin, index) => ({
        language_id: language,
        source_code: code,
        stdin,
        expected_output: testdata.output[index],
        cpu_time_limit: testdata.timeLimit,
      })),
    };

    const judge0Response = await fetch(`${baseUrl}/submissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissions),
    });

    const tokens = await judge0Response.json();
    const results = await Promise.all(
      tokens.map(async ({ token }) => {
        let result;
        while (true) {
          const response = await fetch(`${baseUrl}/submissions/${token}`);
          result = await response.json();
          if (result.hasOwnProperty('error')) {
            return { status: { id: 13 } };
          } else if (result.status.id === 1 || result.status.id === 2) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          } else {
            break;
          }
        }
        return result;
      })
    );

    const statusId = Math.max(...results.map((result) => result.status.id));
    const scoreIncrease = problemScore - userProblemScore;
    const currentDate = new Date();
    const endDate = new Date(process.env.END_DATE);
    if (statusId === 3 && scoreIncrease !== 0 && currentDate < endDate) {
      await User.findOneAndUpdate(
        { sub: user.sub },
        { $inc: { totalScore: scoreIncrease } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { sub: user.sub },
        { $set: { [`problemScore.${problemId}`]: problemScore } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { sub: user.sub },
        { scoreUpdate: new Date() },
        { new: true }
      );
    }
    req.session.userData = await User.findOne(
      { sub: user.sub },
      { _id: 0, __v: 0 }
    );
    const userName = user.name;
    const submission = new Submission({
      userName,
      problemId,
      code,
      language,
      status: statusId,
      date: currentDate,
    });
    await submission.save();
    res.json({ result: statusId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const usersWithSub = await User.find({ role: { $ne: 'Admin' } }, {}).sort({
      totalScore: -1,
      scoreUpdate: 1,
    });
    let userIndex = -1;
    if (req.session.userData) {
      const userSub = req.session.userData.sub;
      userIndex = usersWithSub.findIndex((user) => user.sub === userSub);
    }
    const users = await User.find(
      { role: { $ne: 'Admin' } },
      { _id: 0, id: 1, role: 1, totalScore: 1, scoreUpdate: 1 }
    ).sort({
      totalScore: -1,
      scoreUpdate: 1,
    });
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('leaderboard', {
      loggedIn,
      userId,
      users,
      userIndex,
      userRole,
      contests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const contestSchema = new mongoose.Schema({
  name: String,
  startDate: Date,
  endDate: Date,
  problems: [],
  winners: [],
  admins: [],
  testdata: [],
  users: [],
  submissions: [],
});
const Contest = mongoose.model('Contest', contestSchema);

app.get('/history/:contest', async (req, res) => {
  try {
    const contestName = req.params.contest;
    const contest = await Contest.findOne({ name: contestName }, { _id: 0, name: 1, problems: 1, winners: 1, admins:1 });
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });

    const prizeRefusalCount = await User.countDocuments({ role: 'Prize Refusal' });
    const winners = await User.find(
      { role: { $nin: ['Admin', 'Cheater'] } },
      { _id: 0, id: 1, name: 1, role: 1, totalScore: 1, scoreUpdate: 1 }
    ).sort({
      totalScore: -1,
      scoreUpdate: 1,
    }).limit(5 + prizeRefusalCount);

    res.render('history', { loggedIn, userId, userRole, contest, contests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/contact_us', async (req, res) => {
  try {
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('contact-us', { loggedIn, userId, userRole, contests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const inquirySchema = new mongoose.Schema({
  date: Date,
  loggedIn: Boolean,
  userName: String,
  content: String,
  valid: Boolean,
});
const Inquiry = mongoose.model('Inquiry', inquirySchema);

app.post('/inquiry', async (req, res) => {
  try {
    const { studentId, userName, content } = req.body;
    const loggedIn = req.session.userData ? true : false;
    let valid = true;
    if (!loggedIn) {
      const studentIdRegex = /^[1-3](0[1-9]|10)(0[1-9]|[12][0-9]|30)$/;
      const userNameRegex = /^[가-힣]{2,3}$/;
      valid = studentIdRegex.test(studentId) && userNameRegex.test(userName);
    }
    const inquiryUserName = req.session.userData?.name ?? studentId + userName;
    if (valid) {
      const duplicate = await Inquiry.findOne(
        { loggedIn, userName: inquiryUserName, content },
        { _id: 0, __v: 0, date: 0, loggedIn: 0, userName: 0, content: 0, valid: 0 }
      );
      if (duplicate) {
        valid = false;
      }
    }
    const newInquiry = new Inquiry({
      date: new Date(),
      loggedIn,
      userName: inquiryUserName,
      content,
      valid,
    });
    await newInquiry.save();
    res.redirect('/contact_us');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/manage', async (req, res) => {
  try {
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('manage', { loggedIn, userId, userRole, contests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/settings', async (req, res) => {
  try {
    const loggedIn = req.session.userData !== undefined;
    const userId = req.session.userData?.id;
    const userLanguage = req.session.userData?.language;
    const userRole = req.session.userData?.role;
    const contests = await Contest.find({}, { _id: 0, name: 1 }).sort({ startDate: -1 });
    res.render('settings', {
      loggedIn,
      userId,
      userLanguage,
      userRole,
      contests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/change-id', async (req, res) => {
  try {
    const { id } = req.body;
    const sub = req.session.userData.sub;
    await User.findOneAndUpdate({ sub }, { id }, { new: true });
    req.session.userData.id = id;
    res.redirect('/settings');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/change-language', async (req, res) => {
  try {
    const { language } = req.body;
    const sub = req.session.userData.sub;
    await User.findOneAndUpdate({ sub }, { language }, { new: true });
    req.session.userData.language = language;
    res.redirect('/settings');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 8080;
const start = async () => {
  try {
    await mongoose.connect(mongoUrl);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Listening on ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
  }
};

start();
