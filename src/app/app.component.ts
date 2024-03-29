import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { EpharmaService } from './epharma.service';

class ProductQuantity {
  produitCIP!: string;
  quantity!: number;
  produitName!: string;
}

class Cart {
  pharmacyName!: string;
  pharmacyId!: string;
  products!: ProductQuantity[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  produits: any;
  filteredProduit: any[] = [];

  selectedProduit: any;
  verifiedPharmacies: any[] = [];
  selectedPharmacy: any;
  commandeResult: any = { start: false };

  quantity!: number;
  buyer!: string;
  buyerPhone!: string;
  buyerEmail!: string;

  disponibilites: any[] = [];

  currentPageIndex: number = 0;
  pageCount: number = 0;
  totalCount: number = 0;

  hasResult = false;

  carts: Cart[] = [];

  showCart: boolean = false;

  constructor(private epharmaService: EpharmaService) { }

  ngOnInit(): void {
    this.loadAllProduit();
  }

  loadAllProduit() {
    this.hasResult = false;
    this.filteredProduit = [];
    this.epharmaService.getAllProduit(this.currentPageIndex, environment.pageItemCount).subscribe({
      next: (response: any) => {
        this.produits = response;
        this.hasResult = true;
        this.pageCount = response.pageCount;
        this.filteredProduit = this.produits.items;
      }, error: (err) => {
        console.log(err);
      }
    })
  }

  openCartView() {
    this.showCart = true;
  }

  nextPage() {
    this.currentPageIndex++;
    if (this.currentPageIndex >= this.pageCount) {
      this.currentPageIndex = this.pageCount - 1;
    } else {
      this.loadAllProduit();
    }
  }

  previousPage() {
    this.currentPageIndex--;
    if (this.currentPageIndex < 0) {
      this.currentPageIndex = 0;
    } else {
      this.loadAllProduit();
    }
  }

  verify(cip: any) {
    this.selectedProduit = this.filteredProduit.find(p => p.CIP == cip);
    this.verifiedPharmacies = [];
    for (let i = 0; i < environment.pharmacies.length; i++) {
      this.epharmaService.getDisponibiliteProduit(cip, environment.pharmacies[i]).subscribe({
        next: (response: any) => {
          this.disponibilites.push(response.disponibilites[0]);
          if (response.disponibilites) {
            for (let j = 0; j < response.disponibilites.length; j++) {
              if (response.disponibilites[j].isAvailable) {
                //Display pharmacy for commande
                this.verifiedPharmacies.push(response.pharmacy);
              }
            }
          }
        }, error: (err) => {
          console.log(err);
        }
      })
    }
  }

  applyFilter(event: any) {
    const value = event.target.value.toLowerCase().trim();
    if (value == "") {
      this.filteredProduit = this.produits.items;
    } else {
      this.filteredProduit = this.produits.items.filter((p: any) => p.photoURL != null && p.libelle && p.libelle.toLowerCase().trim().includes(value));
    }
  }

  getLastDisponibiliteByCIP(cip: any) {
    const founds = this.disponibilites.filter((d: any) => d.cip == cip);
    if (founds.length == 0) {
      return null;
    }
    return founds[founds.length - 1].success ? founds[founds.length - 1].isAvailable : false;
  }

  select(pharmacy: any) {
    this.selectedPharmacy = pharmacy;
  }

  commander(cart: Cart, cartIndex: number) {
    if (cart.products.length == 0) {
      alert("Vous n'avez aucun produit");
      return;
    }
    this.commandeResult = { start: true };
    const array = [];
    for (let i = 0; i < cart.products.length; i++) {
      array.push({
        cip: cart.products[i].produitCIP,
        quantity: cart.products[i].quantity
      })
    }
    this.epharmaService.reservationProduit(array, this.buyer, this.buyerPhone, this.buyerEmail, cart.pharmacyId).subscribe({
      next: (response: any) => {
        this.commandeResult = { start: false, success: true, message: "Votre commande a été envoyée avec succès à la pharmacie [" + cart.pharmacyName +"], Réservation " + response.result.reservation + ", TTC: " + response.result.ttc + " FCFA" };
        this.removeCart(cartIndex); 
      }, error: (err) => {
        console.log(err);
        this.commandeResult = { start: false, success: false, message: "Votre commande a échouée !" };
      }
    })
  }

  clear() {
    this.selectedPharmacy = null;
    this.selectedProduit = null;
    this.showCart = false;
    this.commandeResult.start = false;
    this.commandeResult.success = null;
    this.quantity = 1;
  }

  addToCart(productCIP: string, productName: string) {
    let index = -1;
    for (let i = 0; i < this.carts.length; i++) {
      if (this.carts[i].pharmacyId == this.selectedPharmacy._id) {
        index = i;
      }
    }
    if (index < 0) {
      this.carts.push({ pharmacyId: this.selectedPharmacy._id, pharmacyName: this.selectedPharmacy.nom, products: [] });
      index = this.carts.length - 1;
    }
    if (this.quantity) {
      let addNew = true;
      for (let i = 0; i < this.carts[index].products.length; i++) {
        if (this.carts[index].products[i].produitCIP == productCIP) {
          this.carts[index].products[i].quantity += this.quantity;
          addNew = false;
        }
      }
      if (addNew) {
        this.carts[index].products.push({ quantity: this.quantity, produitCIP: productCIP, produitName: productName })
      }
    }
    this.clear()
  }

  removeFromCart(productCIP: string, cartIndex: number) {
    for (let i = 0; i < this.carts[cartIndex].products.length; i++) {
      if (this.carts[cartIndex].products[i].produitCIP == productCIP) {
        this.carts[cartIndex].products.splice(i, 1);
        break;
      }
    }
    if (this.carts[cartIndex].products.length == 0) {
      this.carts.splice(cartIndex, 1);
    }
  }

  removeCart(cartIndex: number) {
    this.carts.splice(cartIndex, 1);
  }
}
