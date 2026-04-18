import {
  addFavoriteProperty,
  fetchFavoriteProperties,
  fetchProperties,
  removeFavoriteProperty,
} from "../models/propertyModel.js";
import {
  renderFavoriteList,
  renderFavoriteMutation,
  renderPropertyList,
} from "../views/propertyView.js";

export async function listProperties(req, res) {
  const rows = await fetchProperties({ limit: req.query.limit, city: req.query.city });
  return renderPropertyList(res, rows);
}

export async function listMyFavorites(req, res) {
  const rows = await fetchFavoriteProperties(req.user?.sub, { limit: req.query.limit });
  return renderFavoriteList(res, rows);
}

export async function addMyFavorite(req, res) {
  const favorite = await addFavoriteProperty(req.user?.sub, req.params.id);
  return renderFavoriteMutation(res, {
    statusCode: 201,
    message: "Property added to favorites",
    favorite,
  });
}

export async function removeMyFavorite(req, res) {
  const favorite = await removeFavoriteProperty(req.user?.sub, req.params.id);
  return renderFavoriteMutation(res, {
    message: "Property removed from favorites",
    favorite,
  });
}
