import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function getAuthToken() {
  return localStorage.getItem("queue_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("queue_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("queue_token");
}

export function getRestaurantId(): number | null {
  const id = localStorage.getItem("queue_restaurant_id");
  return id ? parseInt(id, 10) : null;
}

export function setRestaurantId(id: number) {
  localStorage.setItem("queue_restaurant_id", id.toString());
}

export function removeRestaurantId() {
  localStorage.removeItem("queue_restaurant_id");
}

export function getSessionToken() {
  return localStorage.getItem("queue_session");
}

export function setSessionToken(token: string) {
  localStorage.setItem("queue_session", token);
}

export function removeSessionToken() {
  localStorage.removeItem("queue_session");
}
