import React, { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { auth, fs } from "../Config/Config";
import { CartProducts } from "./CartProducts";
import StripeCheckout from "react-stripe-checkout";
import axios from "axios";
import { Link, useHistory } from "react-router-dom";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Modal } from "./Modal";


toast.configure();

export const Cart = () => {
  // show modal state
  const [showModal, setShowModal] = useState(false);
  const [isPending, setIsPending] = useState(true);
  const [user, setUser] = useState(null);

  // trigger modal
  const triggerModal = () => {
    setShowModal(true);
  };

  // hide modal
  const hideModal = () => {
    setShowModal(false);
  };

  // getting current user function
  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        fs.collection("users")
          .doc(user.uid)
          .get()
          .then((snapshot) => {
            setUser(snapshot.data().FullName);
            setIsPending(false);
          });
      } else {
        setIsPending(false);
        setUser(null);
      }
    });
  }, []);

  // state of cart products
  const [cartProducts, setCartProducts] = useState([]);

  // getting cart products from firestore collection and updating the state
  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        fs.collection("Cart " + user.uid).onSnapshot((snapshot) => {
          const newCartProduct = snapshot.docs.map((doc) => ({
            ID: doc.id,
            ...doc.data(),
          }));
          setCartProducts(newCartProduct);
        });
      } else {
        console.log("user is not signed in to retrieve cart");
      }
    });
  }, []);

  // getting the qty from cartProducts in a seperate array
  const qty = cartProducts.map((cartProduct) => {
    return cartProduct.qty;
  });

  // reducing the qty in a single value
  const reducerOfQty = (accumulator, currentValue) =>
    accumulator + currentValue;

  const totalQty = qty.reduce(reducerOfQty, 0);

  // console.log(totalQty);

  // getting the TotalProductPrice from cartProducts in a seperate array
  const price = cartProducts.map((cartProduct) => {
    return cartProduct.TotalProductPrice;
  });

  // reducing the price in a single value
  const reducerOfPrice = (accumulator, currentValue) =>
    accumulator + currentValue;

  const totalPrice = price.reduce(reducerOfPrice, 0);

  // global variable
  let Product;

  // cart product increase function
  const cartProductIncrease = (cartProduct) => {
    // console.log(cartProduct);
    Product = cartProduct;
    Product.qty = Product.qty + 1;
    Product.TotalProductPrice = Product.qty * Product.price;
    // updating in database
    auth.onAuthStateChanged((user) => {
      if (user) {
        fs.collection("Cart " + user.uid)
          .doc(cartProduct.ID)
          .update(Product)
          .then(() => {
            console.log("increment added");
          });
      } else {
        console.log("user is not logged in to increment");
      }
    });
  };

  // cart product decrease functionality
  const cartProductDecrease = (cartProduct) => {
    Product = cartProduct;
    if (Product.qty > 1) {
      Product.qty = Product.qty - 1;
      Product.TotalProductPrice = Product.qty * Product.price;
      // updating in database
      auth.onAuthStateChanged((user) => {
        if (user) {
          fs.collection("Cart " + user.uid)
            .doc(cartProduct.ID)
            .update(Product)
            .then(() => {
              console.log("decrement");
            });
        } else {
          console.log("user is not logged in to decrement");
        }
      });
    }
  };

  // state of totalProducts
  const [totalProducts, setTotalProducts] = useState(0);
  // getting cart products
  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        fs.collection("Cart " + user.uid).onSnapshot((snapshot) => {
          const qty = snapshot.docs.length;
          setTotalProducts(qty);
        });
      }
    });
  }, []);

  // charging payment
  const history = useHistory();
  const handleToken = async (token) => {
    //  console.log(token);
    const cart = { name: "All Products", totalPrice };
    const response = await axios.post("http://localhost:8080/checkout", {
      token,
      cart,
    });
    console.log(response);
    let { status } = response.data;
    console.log(status);
    if (status === "success") {
      history.push("/");
      toast.success("Your order has been placed successfully", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
      });

      const uid = auth.currentUser.uid;
      const carts = await fs.collection("Cart " + uid).get();
      for (var snap of carts.docs) {
        fs.collection("Cart " + uid)
          .doc(snap.id)
          .delete();
      }
    } else {
      alert("Something went wrong in checkout");
    }
  };

  if (isPending)
    return (
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          height: "100vh",
        }}
      >
        Your cart is getting filled...
      </h2>
    );

  return (
    <>
      {!isPending && (
        <>
          <Navbar user={user} totalProducts={totalProducts} />
          <br></br>
          {cartProducts.length > 0 && (
            <div className="container-fluid">
              <h1 className="text-center">Cart</h1>
              <div className="products-box">
                <CartProducts
                  cartProducts={cartProducts}
                  cartProductIncrease={cartProductIncrease}
                  cartProductDecrease={cartProductDecrease}
                />
              </div>
              <div className="summary-box" style={{ background: "white" }}>
                <h5>Cart Summary</h5>
                <br></br>
                <div>
                  Total No of Products: <span>{totalQty}</span>
                </div>
                <div>
                  Total Price to Pay: <span>$ {totalPrice}</span>
                </div>
                <br></br>
                <button
                  className="btn btn-secondary btn-md"
                  onClick={() => triggerModal()}
                >
                  Cash on Delivery
                </button>
                <h6 className="text-center" style={{ marginTop: 7 + "px" }}>
                  OR
                </h6>
                <Link to="/">
                  <button
                    className="btn btn-secondary btn-md"
                    style={{ width: "100%", background: "#ffd814", color:"black" }}
                  >
                    Continue Shopping
                  </button>
                </Link>
              </div>
            </div>
          )}
          {cartProducts.length < 1 && (
            <div  className="container-fluid flex">Please add some items from <Link to="/" >here</Link></div>
          )}

          {showModal === true && (
            <Modal
              TotalPrice={totalPrice}
              totalQty={totalQty}
              hideModal={hideModal}
            />
          )}
        </>
      )}
    </>
  );
};