const Sauce = require('../models/sauce');
const fs = require('fs');

exports.getAllSauces = (req, res, next) => {
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject._userId;
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
    likes: 0,
    dislikes: 0,
    userLiked: [],
    userDisliked: [],
  });
  sauce
    .save()
    .then(() => res.status(201).json({ message: 'Objet enregistré !' }))
    .catch((error) => res.status(400).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file
    ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
      }
    : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: 'Not authorized' });
      } else {
        Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
          .then(() => res.status(200).json({ message: 'Objet modifié!' }))
          .catch((error) => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: 'Not authorized' });
      } else {
        const filename = sauce.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: 'Objet supprimé !' });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.likeSauce = (req, res, next) => {
  let userLiked = null;
  let userDisliked = null;
  Sauce.findOne({ _id: req.params.id })
    .then((sauces) => {
      for (i = 0; i < sauces.usersLiked.length; i++) {
        if (req.auth.userId == sauces.usersLiked[i]) {
          userLiked = "he's like";
        } else {
          userLiked = null;
        }
      }
      for (i = 0; i < sauces.usersDisliked.length; i++) {
        if (req.auth.userId == sauces.usersDisliked[i]) {
          userDisliked = "he's dislike";
        } else {
          userDisliked = null;
        }
      }
      if (req.body.like > 0 && userLiked == null) {
        const usersLikedArray = sauces.usersLiked;
        usersLikedArray.push(req.auth.userId);
        Sauce.updateOne({ _id: req.params.id }, { $set: { likes: sauces.likes + 1, usersLiked: usersLikedArray } })
          .then(() => res.status(200).json({ message: 'Objet modifié!' }))
          .catch((error) => res.status(401).json({ error }));
        return;
      } else if (req.body.like < 0 && userDisliked == null) {
        const usersDislikedArray = sauces.usersDisliked;
        usersDislikedArray.push(req.auth.userId);
        Sauce.updateOne(
          { _id: req.params.id },
          { $set: { dislikes: sauces.dislikes + 1, usersDisliked: usersDislikedArray } }
        )
          .then(() => res.status(200).json({ message: 'Objet modifié!' }))
          .catch((error) => res.status(401).json({ error }));
        return;
      } else {
        if (userLiked != null) {
          const usersLikedArray = sauces.usersLiked;
          usersLikedArray.splice(usersLikedArray.indexOf(req.auth.userId), 1);
          Sauce.updateOne({ _id: req.params.id }, { $set: { likes: sauces.likes - 1, usersLiked: usersLikedArray } })
            .then(() => res.status(200).json({ message: 'Objet modifié!' }))
            .catch((error) => res.status(401).json({ error }));
          return;
        } else {
          const usersDislikedArray = sauces.usersDisliked;
          usersDislikedArray.splice(usersDislikedArray.indexOf(req.auth.userId), 1);
          Sauce.updateOne(
            { _id: req.params.id },
            { $set: { dislikes: sauces.dislikes - 1, usersDisliked: usersDislikedArray } }
          )
            .then(() => res.status(200).json({ message: 'Objet modifié!' }))
            .catch((error) => res.status(401).json({ error }));
          return;
        }
      }
    })
    .catch((error) => res.status(400).json({ error }));
};
