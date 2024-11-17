let express = require('express')
let app = express()

let {open} = require('sqlite')
let sqlite3 = require('sqlite3')

let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')

let path = require('path')
let path_db = path.join(__dirname, 'twitterClone.db')

app.use(express.json())

let db_object = null

let IntializeTheDatabase = async () => {
  try {
    db_object = await open({
      filename: path_db,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Db Error: ${e.message}`)
    process.exit(1)
  }
}

IntializeTheDatabase()

//Middleware function():-

let authenticatetoken = (request, response, next) => {
  let jwttoken

  let authe = request.headers['authorization']

  if (authe !== undefined) {
    jwttoken = authe.split(' ')[1]
  }
  if (jwttoken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwttoken, 'MY_SECRET_KEY', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//Ist API (POST):-

app.post('/register/', async (request, response) => {
  let details = request.body
  let {username, password, name, gender} = details

  let hashedpassword = await bcrypt.hash(password, 10)

  let clause = `SELECT *
    FROM user
    WHERE username = "${username}";`

  let res_object = await db_object.get(clause)

  if (res_object === undefined) {
    let query = `INSERT INTO user(name, username, password, gender)
        VALUES('${name}', '${username}', '${hashedpassword}', '${gender}');`

    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      let data_object = await db_object.run(query)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//2nd API(POST):-

app.post('/login/', async (request, response) => {
  let {username, password} = request.body

  let clause = `SELECT *
  FROM user
  WHERE username = "${username}";`

  let res_object = await db_object.get(clause)

  if (res_object !== undefined) {
    let matchpassword = await bcrypt.compare(password, res_object.password)

    if (matchpassword === true) {
      let payload = {username: username}

      let jwttoken = jwt.sign(payload, 'MY_SECRET_KEY')
      response.send({jwtToken: jwttoken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

//3rd API(GET):-

app.get('/user/tweets/feed/', authenticatetoken, async (request, response) => {
  let {username} = request

  let clause = `SELECT user.username AS userName,
  tweet.tweet AS tweet,
  tweet.date_time AS dateTime
  FROM user JOIN tweet ON user.user_id = tweet.user_id
  JOIN follower ON tweet.user_id = follower.following_user_id
  WHERE user.username = "${username}"
  GROUP BY tweet.tweet_id
  ORDER BY tweet.datetime DESC
  LIMIT 4
  OFFSET 0;`

  let res_object = await db_object.all(clause)
  response.send(res_object)
})

//4th API(GET):-

app.get('/user/following/', authenticatetoken, async (request, response) => {
  let {username} = request

  let clause = `SELECT user.name AS name
  FROM user JOIN follower ON user.user_id = follower.following_user_id
  WHERE user.username = "${username}";`

  let res_object = await db_object.all(clause)
  response.send(res_object)
})

//5th API(GET):-

app.get('/user/followers/', authenticatetoken, async (request, response) => {
  let {username} = request

  let clause = `SELECT user.name AS name
  FROM user JOIN follower ON user.user_id = follower.follower_user_id
  WHERE user.username = "${username}";`

  let res_object = await db_object.all(clause)
  response.send(res_object)
})

//6th API(GET):-

app.get('/tweets/:tweetId/', authenticatetoken, async (request, response) => {
  let {username} = request

  let {tweetId} = request.params

  let clause = `SELECT tweet.tweet AS tweet,
  COUNT(like.tweet_id) AS likes,
  COUNT(reply.tweet_id) AS replies,
  tweet.date_time AS dateTime
  FROM user JOIN follower ON user.user_id = follower.following_user_id 
  JOIN tweet ON follower.following_user_id = tweet.user_id
  JOIN reply ON tweet.tweet_id = reply.tweet_id 
  JOIN like ON reply.user_id = like.user_id
  WHERE user.username = "${username}" AND tweet.tweet_id = ${tweetId};`

  let res_object = await db_object.get(clause)

  if (res_object.tweetId === tweetId) {
    response.send(res_object)
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

//7th API(GET):-

app.get(
  '/tweets/:tweetId/likes/',
  authenticatetoken,
  async (request, response) => {
    let {username} = request

    let {tweetId} = request.params

    let clause = `SELECT
  user.username AS likes
  FROM user JOIN follower ON user.user_id = follower.following_user_id 
  JOIN tweet ON follower.following_user_id = tweet.user_id
  JOIN like ON tweet.user_id = like.user_id
  WHERE user.username = "${username}" AND tweet.tweet_id = ${tweetId};`

    let res_object = await db_object.get(clause)

    if (res_object.tweetId === tweetId) {
      response.send(res_object)
    } else {
      response.status(401)
      response.send('Invalid Request')
    }
  },
)

//8th API(GET):-

app.get(
  '/tweets/:tweetId/replies/',
  authenticatetoken,
  async (request, response) => {
    let {username} = request

    let {tweetId} = request.params

    let clause = `SELECT
  user.username AS likes
  FROM user JOIN follower ON user.user_id = follower.following_user_id 
  JOIN tweet ON follower.following_user_id = tweet.user_id
  JOIN reply ON tweet.user_id = reply.user_id
  WHERE user.username = "${username}" AND tweet.tweet_id = ${tweetId};`

    let res_object = await db_object.get(clause)

    if (res_object.tweetId === tweetId) {
      response.send(res_object)
    } else {
      response.status(401)
      response.send('Invalid Request')
    }
  },
)

//9th API(GET):-

app.get('/user/tweets/', authenticatetoken, async (request, response) => {
  let {username} = request

  let clause = `SELECT tweet.tweet AS tweet,
  COUNT(like.tweet_id) AS likes,
  COUNT(reply.tweet_id) AS replies,
  tweet.date_time AS dateTime
  FROM user JOIN reply ON user.user_id = reply.user_id
  JOIN tweet ON reply.tweet_id = tweet.tweet_id 
  JOIN like ON tweet.tweet_id = like.tweet_id
  WHERE user.username = "${username}";`

  let res_object = await db_object.all(clause)
  response.send(res_object)
})

//10th API(POST):-

app.post('/user/tweets/', authenticatetoken, async (request, response) => {
  let {tweet} = request.body

  let clause = `INSERT INTO tweet(tweet)
  VALUES('${tweet}');`

  let res_object = await db_object.run(clause)
  response.send('Created a Tweet')
})

//11th API(DELETE):-

app.delete("/tweets/:tweetId/", authenticatetoken, async (request, response) => {
  let { username } = request;
  let { tweetId } = request.params;


  let clause = `SELECT * FROM tweet 
                JOIN user ON tweet.user_id = user.user_id 
                WHERE tweet.tweet_id = ${tweetId} AND user.username = "${username}";`;
  let res_object = await db_object.get(clause);


  if (res_object) {
    let query = `DELETE FROM tweet WHERE tweet_id = ${tweetId};`;
    await db_object.run(query);
    response.send("Tweet Removed");
  } else {
    response.status(401).send("Invalid Request");
  }
});

module.exports = app
