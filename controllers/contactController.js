const validator = require("validator");
const sanitizeHtml = require("sanitize-html");
const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");
const petsCollection = require("../db").db().collection("pets");
const contactsCollection = require("../db").db().collection("contacts");


const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {}
}

exports.submitContact = async function(req, res, next) {

  if(req.body.secret.toUpperCase() !== "PUPPY") {
    console.log("spam detected")
    return res.json({message: "Sorry!"})
  }

  if(typeof req.body.name != "string") {
    req.body.name = ""
  }

  if(typeof req.body.email != "string") {
    req.body.email = ""
  }

  if(typeof req.body.comment != "string") {
    req.body.comment = ""
  }

  if(!validator.isEmail(req.body.email)) {
    console.log("invalid email detected")
    return res.json({message: "Sorry!"})
  }

  if(!ObjectId.isValid(req.body.petId)) {
    console.log("invalid id detected")
    return res.json({message: "Sorry!"})
  }

  req.body.petId = new ObjectId(req.body.petId)
  const doesPetExist = await petsCollection.findOne({_id: req.body.petId})

  if(!doesPetExist) {
    console.log("pet is not exist")
    return res.json({message: "Sorry!"})
  }

  const ourObject = {
    petId: req.body.petId,
    name: sanitizeHtml(req.body.name, sanitizeOptions),
    email: sanitizeHtml(req.body.email, sanitizeOptions),
    comment: sanitizeHtml(req.body.comment, sanitizeOptions)
  }

  console.log(ourObject)
  const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAILTRAPUSERNAME,
      pass: process.env.MAILTRAPPASSWORD
    }
  });
  try {
    const sendMailToUser = transport.sendMail({
      to: ourObject.email,
      from: "petadoption@localhost",
      subject: `thank you for your interest in ${doesPetExist.name}`,
      html: `<h3 style="color: purple; font-size: 30px; font-weight: normal;">thank you!</h3>
    <p>We appreciate your interest in ${doesPetExist.name} and one of our staff members will reach out to you shortly! Below os a copy of the message you sent us for your personal records:</p>
    <p><em>${ourObject.comment}</em></p>`
    })

    const sendMailToAdmin = transport.sendMail({
      to: "petadoption@localhost",
      from: "petadoption@localhost",
      subject: `someone interested in ${doesPetExist.name}`,
      html: `<h3 style="color: purple; font-size: 30px; font-weight: normal;">new contact!</h3>
    <p>name: ${ourObject.name} <br>
    pet interested in: ${doesPetExist.name} <br>
    email: ${ourObject.email} <br>
    message: ${ourObject.comment}
    </p>`
    })

    const insertContactInfo = await contactsCollection.insertOne(ourObject)

    await Promise.all([sendMailToAdmin, sendMailToUser, insertContactInfo])
  } catch (error) {
    next(error)
  }

  res.send("thanks for sending data to us")
}

exports.viewPetContacts = async (req, res) => {
  res.render("pet-contacts")
}